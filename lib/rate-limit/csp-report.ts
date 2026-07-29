import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

const MAX_REPORTS_PER_WINDOW = 20;
const WINDOW_SECONDS = 600; // 10 minutes

/** Hextets kept when bucketing an IPv6 address: 4 x 16 bits = a /64. */
const IPV6_PREFIX_HEXTETS = 4;

/**
 * Collapse a client address to the unit the limiter counts against, and that
 * the collector's logs attribute reports to.
 *
 * IPv4 addresses are used whole: one address is one host, and an attacker
 * wanting a second bucket has to acquire a second address.
 *
 * IPv6 is bucketed to its `/64` network prefix, because keying on the full
 * address does not bound anything. The smallest block anyone is handed is a
 * /64 — RFC 4291 § 2.5.1 fixes the interface identifier at 64 bits for every
 * unicast address outside 000/3 — so one ordinary allocation contains 2^64
 * addresses a single party can source at will. A per-address counter therefore
 * produces an unbounded number of distinct keys, and since each new key is a
 * billed KV write, the "limiter" inverts into a cost amplifier: the harder it
 * is flooded, the more we pay. Truncating to /64 makes one subnet one bucket.
 *
 * /64 rather than a broader /56 or /48 is deliberate, and the honest argument
 * for it is comparative rather than absolute. A /64 does NOT guarantee one
 * party: it is one link, and any guest or shared network puts unrelated
 * visitors on the same one. What it guarantees is that the merging it causes
 * is no worse than merging this project has already accepted elsewhere — a
 * single IPv4 address is likewise shared, and `lib/rate-limit/orders.ts`
 * documents whole populations of Ivorian mobile customers behind one CGNAT
 * address. Bucketing IPv6 at /64 is strictly less aggressive than that, while
 * removing the unbounded-key problem entirely. Broader prefixes would bucket
 * harder but start grouping genuinely distinct end sites, and this limiter's
 * failure mode is *losing reports*, which are the data the enforcement
 * decision rests on.
 *
 * The residual is worth stating plainly: an end site holding a /56 still
 * commands 256 buckets, so 5,120 reports per ten minutes and 256 KV keys.
 * That is bounded and affordable, where the previous behaviour was neither.
 * If the collector's own logs ever show one flood spread across sibling /64s,
 * widen this constant to 3 hextets (/48); the shape of the fix does not
 * change.
 *
 * IPv4-mapped addresses (`::ffff:192.0.2.1`, and equally the hexadecimal
 * spelling `::ffff:c000:0201`) are unwrapped to the IPv4 host they carry, so
 * neither spelling sidesteps the IPv4 path. Only that mapping is unwrapped:
 * an embedded dotted quad anywhere else — `2001:db8::192.0.2.1`, or the
 * NAT64 well-known prefix `64:ff9b::192.0.2.1` — belongs to a real and
 * distinct IPv6 network and is bucketed on its own /64. Unwrapping those
 * would have collided unrelated networks onto one IPv4 key, and onto the key
 * of the genuine IPv4 host of that address. The deprecated IPv4-compatible
 * form (`::192.0.2.1`, RFC 4291 § 2.5.5.1) is likewise left alone: it is
 * indistinguishable from `::1` and other reserved addresses in the `::/64`
 * block, which no real client is ever seen from.
 */
export function clientNetworkKey(rawAddress: string): string {
  const address = rawAddress.trim().toLowerCase().slice(0, 64);
  if (!address) return "unknown";

  // No colon: IPv4, or something unparseable that is bucketed as itself.
  if (!address.includes(":")) return address;

  const hextets = expandIpv6(address);
  if (!hextets) return address;

  // `::ffff:x.y.z.w` — the only mapping that denotes an IPv4 host rather than
  // an IPv6 network. Unwrap it so both its spellings land on the IPv4 path.
  const isIpv4Mapped =
    hextets.slice(0, 5).every((hextet) => hextet === "0") && hextets[5] === "ffff";
  if (isIpv4Mapped) return dottedQuad(hextets[6], hextets[7]);

  return `${hextets.slice(0, IPV6_PREFIX_HEXTETS).join(":")}::/64`;
}

/** Render the low 32 bits of an IPv4-mapped address as a dotted quad. */
function dottedQuad(high: string, low: string): string {
  const value = (parseInt(high, 16) << 16) | parseInt(low, 16);
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(".");
}

/**
 * Expand `::` compression to a full 8-hextet list; null if it does not parse.
 * A trailing dotted quad is folded into the two hextets it encodes first, so
 * `::ffff:192.0.2.1` and `::ffff:c000:201` reduce to the same list.
 */
function expandIpv6(input: string): string[] | null {
  let address = input;
  const quad = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (quad) {
    const octets = quad.slice(1, 5).map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    address = `${address.slice(0, quad.index)}${high}:${low}`;
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (head.length + tail.length > 8) return null;
  if (halves.length === 1 && head.length !== 8) return null;
  if (![...head, ...tail].every((hextet) => /^[0-9a-f]{1,4}$/.test(hextet))) return null;

  const padding: string[] = new Array(8 - head.length - tail.length).fill("0");
  // Strip leading zeros so 2001:0db8:… and 2001:db8:… land in the same bucket.
  return [...head, ...padding, ...tail].map((hextet) => hextet.replace(/^0+(?=.)/, ""));
}

/**
 * Per-client throttle on the CSP violation collector (`/api/csp-report`).
 *
 * Keyed on the network derived from `cf-connecting-ip` rather than on a user
 * id, because the endpoint is unauthenticated by nature — browsers post
 * violation reports with no credentials, so there is no session to key on.
 * `cf-connecting-ip` is set by Cloudflare's edge and cannot be forged by the
 * client, so it is the only address header worth trusting here
 * (`x-forwarded-for` is caller-supplied and would make the limiter trivially
 * evadable).
 *
 * The CGNAT concern that ruled out IP keying for orders (many Ivorian mobile
 * customers share one egress address) applies here too, but with the opposite
 * conclusion: over-throttling a shared address costs us some *telemetry*, not
 * a customer's order. Losing reports is an acceptable failure mode; letting an
 * unauthenticated endpoint drive unbounded logging and KV traffic is not.
 *
 * 20 per 10 minutes is generous for a real browser — a user agent coalesces
 * violations per (directive, blocked URL) pair, so a genuinely broken page
 * produces a handful of reports, not a stream — while capping a flood at two
 * KV writes a minute per network. Once the window is saturated
 * `checkKVRateLimit` stops writing entirely and only reads, so a sustained
 * flood degrades to one KV read per request.
 */
export async function checkCspReportRateLimit(kv: KVNamespace, networkKey: string): Promise<boolean> {
  // Bound the key: an oversized KV key is a rejected write rather than a
  // stored counter, which would silently disable the limiter.
  const safeKey = networkKey.slice(0, 64);
  return checkKVRateLimit(kv, `csp-report:rate:${safeKey}`, {
    max: MAX_REPORTS_PER_WINDOW,
    windowSeconds: WINDOW_SECONDS,
  });
}
