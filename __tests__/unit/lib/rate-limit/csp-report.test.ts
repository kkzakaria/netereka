import { describe, it, expect } from "vitest";
import { clientNetworkKey } from "@/lib/rate-limit/csp-report";

/**
 * The CSP collector's limiter counts against whatever this function returns.
 * If one party can produce many distinct return values, the limiter bounds
 * nothing — and because every new value is a fresh (billed) KV key, it turns
 * into a cost amplifier under exactly the load it exists to stop.
 */
describe("clientNetworkKey", () => {
  it("uses an IPv4 address whole", () => {
    expect(clientNetworkKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it("collapses an IPv6 address to its /64 network", () => {
    // The single most important case: 2^64 addresses, one bucket.
    expect(clientNetworkKey("2001:db8:1234:5678:dead:beef:0:1")).toBe("2001:db8:1234:5678::/64");
    expect(clientNetworkKey("2001:db8:1234:5678:0:0:0:2")).toBe("2001:db8:1234:5678::/64");
  });

  it("gives every address in one /64 the same bucket", () => {
    const buckets = new Set(
      Array.from({ length: 500 }, (_, i) => clientNetworkKey(`2001:db8:1:2:3:4:5:${i.toString(16)}`))
    );
    expect(buckets.size).toBe(1);
  });

  it("keeps distinct /64s in distinct buckets", () => {
    expect(clientNetworkKey("2001:db8:1:2::1")).not.toBe(clientNetworkKey("2001:db8:1:3::1"));
  });

  it("normalises compression and leading zeros to one spelling", () => {
    // Otherwise the same subnet spelled three ways is three buckets.
    const canonical = "2001:db8:0:1::/64";
    expect(clientNetworkKey("2001:0db8:0000:0001:0000:0000:0000:0001")).toBe(canonical);
    expect(clientNetworkKey("2001:db8:0:1::1")).toBe(canonical);
    expect(clientNetworkKey("2001:DB8:0:1:0:0:0:1")).toBe(canonical);
  });

  it("handles an address compressed inside the prefix itself", () => {
    expect(clientNetworkKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("unwraps IPv4-mapped addresses so they cannot sidestep the IPv4 path", () => {
    expect(clientNetworkKey("::ffff:192.0.2.1")).toBe("192.0.2.1");
  });

  it("unwraps the hexadecimal spelling of an IPv4-mapped address too", () => {
    // ::ffff:c000:0201 is the same host as ::ffff:192.0.2.1. Recognising only
    // the dotted spelling let this one fall into the shared ::/64 bucket,
    // merging every mapped address that used hex into a single counter.
    expect(clientNetworkKey("::ffff:c000:0201")).toBe("192.0.2.1");
    expect(clientNetworkKey("::ffff:c000:0201")).toBe(clientNetworkKey("::ffff:192.0.2.1"));
  });

  it("does not unwrap a dotted quad that is part of a real IPv6 network", () => {
    // Unwrapping any trailing dotted quad collided unrelated networks onto one
    // IPv4 key — and onto the key of the genuine IPv4 host of that address.
    expect(clientNetworkKey("2001:db8::192.0.2.1")).toBe("2001:db8:0:0::/64");
    expect(clientNetworkKey("64:ff9b::192.0.2.33")).toBe("64:ff9b:0:0::/64");

    const keys = new Set([
      clientNetworkKey("2001:db8::192.0.2.1"),
      clientNetworkKey("64:ff9b::192.0.2.1"),
      clientNetworkKey("192.0.2.1"),
    ]);
    expect(keys.size).toBe(3);
  });

  it("leaves the deprecated IPv4-compatible form in the reserved ::/64 bucket", () => {
    // RFC 4291 § 2.5.5.1 deprecates ::a.b.c.d, and it is indistinguishable
    // from ::1 and the rest of the reserved block that no real client uses.
    expect(clientNetworkKey("::192.0.2.1")).toBe("0:0:0:0::/64");
    expect(clientNetworkKey("::1")).toBe("0:0:0:0::/64");
  });

  it("rejects an out-of-range dotted quad rather than mis-bucketing it", () => {
    expect(clientNetworkKey("::ffff:999.0.2.1")).toBe("::ffff:999.0.2.1");
  });

  it("buckets an unparseable address as itself rather than failing open", () => {
    // A value that is not an address at all must still land in *some* bucket;
    // returning a constant or throwing would either merge every client or
    // disable the limiter.
    expect(clientNetworkKey("2001:db8:::1")).toBe("2001:db8:::1");
    expect(clientNetworkKey("nonsense:zz::")).toBe("nonsense:zz::");
  });

  it("falls back to a single bucket when no address was supplied", () => {
    expect(clientNetworkKey("")).toBe("unknown");
    expect(clientNetworkKey("   ")).toBe("unknown");
  });

  it("bounds the key length whatever it is handed", () => {
    expect(clientNetworkKey("a".repeat(500)).length).toBeLessThanOrEqual(64);
  });
});
