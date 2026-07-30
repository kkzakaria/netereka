/**
 * The single answer to "is this account's ban in force right now?".
 *
 * Shared on purpose between the web guards (`lib/auth/guards.ts`) and the
 * WhatsApp Worker (`workers/whatsapp/src/tools/guards.ts`). The rule has two
 * traps in it, and a second copy would eventually get one of them wrong:
 *
 *   1. A ban with **no** expiry is permanent. `banned && !banExpires` is the
 *      normal shape of an indefinite suspension, not a missing value to ignore.
 *   2. A ban whose expiry has **passed** no longer bans. better-auth's admin
 *      plugin only clears the flag when a *new* session is created (sign-in),
 *      so an account can sit at `banned = 1` with an expiry in the past
 *      indefinitely. Reading `if (banned)` alone would lock that account out
 *      for good, long after its sanction ended.
 *
 * Deliberately free of imports so the Worker can import it: no `next/*`, no D1
 * handle, nothing that reaches the Worker bundle beyond this function.
 */

/**
 * `banned` as it reaches us: a boolean from better-auth's session payload, or
 * the raw `INTEGER` 0/1 of the `user.banned` column read directly from D1.
 */
export type BanFlag = boolean | number | null | undefined;

/**
 * `banExpires` arrives in three shapes for one column, so the predicate accepts
 * all three rather than making each caller normalise:
 *  - `Date` — a fresh better-auth read on the web;
 *  - ISO `string` — the session-cookie cache (better-auth re-hydrates only
 *    `createdAt`/`updatedAt` into `Date`s, so this one stays a `JSON.parse`
 *    string), and the raw D1 `TEXT` column the Worker reads (better-auth's
 *    kysely adapter runs with `supportsDates: false` on sqlite);
 *  - `number` — epoch milliseconds, for callers holding a timestamp.
 */
export type BanExpiry = Date | string | number | null | undefined;

/**
 * @param now Reference instant in epoch milliseconds. Defaults to the current
 *   clock; passed explicitly by tests, and available to any caller that must
 *   judge several accounts against one instant.
 */
export function isActivelyBanned(
  user: { banned?: BanFlag; banExpires?: BanExpiry },
  now: number = Date.now()
): boolean {
  if (!user.banned) return false;
  if (!user.banExpires) return true;

  const expiresAt = new Date(user.banExpires).getTime();
  // An unreadable expiry is not evidence that the sanction ended. `NaN > now`
  // is false, so a naive comparison would quietly *clear* the ban of an
  // account whose column is corrupt — the one direction where guessing wrong
  // grants access instead of denying it. Keep the ban.
  if (Number.isNaN(expiresAt)) return true;

  return expiresAt > now;
}
