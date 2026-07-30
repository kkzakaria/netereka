import { describe, it, expect, vi, afterEach } from "vitest";
import { isActivelyBanned } from "@/lib/auth/ban";

const NOW = 1_700_000_000_000;

afterEach(() => {
  vi.useRealTimers();
});

describe("isActivelyBanned", () => {
  it("treats a permanent ban (no expiry) as active", () => {
    expect(isActivelyBanned({ banned: 1, banExpires: null }, NOW)).toBe(true);
    expect(isActivelyBanned({ banned: true, banExpires: null }, NOW)).toBe(true);
  });

  it("treats a future-dated ban as active", () => {
    expect(isActivelyBanned({ banned: 1, banExpires: NOW + 60_000 }, NOW)).toBe(true);
  });

  it("treats an expired ban as inactive", () => {
    expect(isActivelyBanned({ banned: 1, banExpires: NOW - 60_000 }, NOW)).toBe(false);
  });

  it("treats an unbanned user as inactive whatever the expiry says", () => {
    expect(isActivelyBanned({ banned: 0, banExpires: null }, NOW)).toBe(false);
    expect(isActivelyBanned({ banned: false, banExpires: null }, NOW)).toBe(false);
    // A leftover expiry on a lifted ban must not resurrect it.
    expect(isActivelyBanned({ banned: 0, banExpires: NOW + 60_000 }, NOW)).toBe(false);
  });

  it("treats a missing ban field as inactive", () => {
    expect(isActivelyBanned({}, NOW)).toBe(false);
    expect(isActivelyBanned({ banned: null, banExpires: null }, NOW)).toBe(false);
    expect(isActivelyBanned({ banned: undefined }, NOW)).toBe(false);
  });

  // The web reads banExpires as a Date on a fresh D1 read and as an ISO string
  // out of the session-cookie cache; the Worker reads the raw D1 TEXT column,
  // which is what better-auth writes for a sqlite dialect (supportsDates:false).
  // All three shapes must decide the same way — that is the whole point of
  // there being one predicate.
  it("decides identically for a Date, an ISO string and epoch milliseconds", () => {
    const future = NOW + 60_000;
    const past = NOW - 60_000;

    for (const expiry of [new Date(future), new Date(future).toISOString(), future]) {
      expect(isActivelyBanned({ banned: 1, banExpires: expiry }, NOW)).toBe(true);
    }
    for (const expiry of [new Date(past), new Date(past).toISOString(), past]) {
      expect(isActivelyBanned({ banned: 1, banExpires: expiry }, NOW)).toBe(false);
    }
  });

  // An expiry that cannot be read is not evidence that the sanction ended.
  // Returning false here would let a flagged account straight through on the
  // strength of a corrupt column — the one case where guessing wrong grants
  // access rather than denying it.
  it("keeps a ban active when the expiry cannot be parsed", () => {
    expect(isActivelyBanned({ banned: 1, banExpires: "not-a-date" }, NOW)).toBe(true);
    expect(isActivelyBanned({ banned: 1, banExpires: new Date("nope") }, NOW)).toBe(true);
    expect(isActivelyBanned({ banned: 1, banExpires: Number.NaN }, NOW)).toBe(true);
  });

  it("is exactly at the boundary: an expiry equal to now has passed", () => {
    expect(isActivelyBanned({ banned: 1, banExpires: NOW }, NOW)).toBe(false);
    expect(isActivelyBanned({ banned: 1, banExpires: NOW + 1 }, NOW)).toBe(true);
  });

  it("falls back to the current clock when no reference time is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(isActivelyBanned({ banned: 1, banExpires: NOW + 60_000 })).toBe(true);
    expect(isActivelyBanned({ banned: 1, banExpires: NOW - 60_000 })).toBe(false);
  });
});
