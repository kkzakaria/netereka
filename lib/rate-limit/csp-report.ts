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
 * /64 rather than a broader /56 or /48 is deliberate. /64 is the one prefix
 * length that is a hard boundary in the addressing architecture, so no
 * legitimate deployment puts unrelated parties inside a single /64 — this
 * bucket can never merge two strangers. Broader prefixes would bucket harder
 * but would start grouping genuinely distinct end sites, and this limiter's
 * failure mode is *losing reports*, which are the data the enforcement
 * decision rests on. The residual is worth stating plainly: an end site
 * holding a /56 still commands 256 buckets, so 5,120 reports per ten minutes
 * and 256 KV keys. That is bounded and affordable, where the previous
 * behaviour was neither. If the collector's own logs ever show one flood
 * spread across sibling /64s, widen this constant to 3 hextets (/48); the
 * shape of the fix does not change.
 *
 * IPv4-mapped forms (`::ffff:192.0.2.1`) are unwrapped to the IPv4 address
 * they carry, so they cannot be used to sidestep the IPv4 path.
 */
export function clientNetworkKey(rawAddress: string): string {
  const address = rawAddress.trim().toLowerCase().slice(0, 64);
  if (!address) return "unknown";

  // No colon: IPv4, or something unparseable that is bucketed as itself.
  if (!address.includes(":")) return address;

  // IPv4-mapped / IPv4-compatible: the embedded dotted quad is the real host.
  const embedded = address.slice(address.lastIndexOf(":") + 1);
  if (embedded.includes(".")) return embedded;

  const hextets = expandIpv6(address);
  if (!hextets) return address;
  return `${hextets.slice(0, IPV6_PREFIX_HEXTETS).join(":")}::/64`;
}

/** Expand `::` compression to a full 8-hextet list; null if it does not parse. */
function expandIpv6(address: string): string[] | null {
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
