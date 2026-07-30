import type { ToolContext } from "../types";
// Shared with the web guards on purpose: "is this ban in force?" has exactly
// one implementation in this repo. lib/auth/guards.ts cannot be imported here
// (it pulls in `next/navigation`), so the predicate itself lives in a pure
// module both sides import. It has no imports of its own, so nothing extra
// reaches the Worker bundle. See lib/auth/ban.ts.
import { isActivelyBanned } from "../../../../lib/auth/ban";

/** Refusals shown to the customer. Read by a human on WhatsApp, so: French. */
export const ACCOUNT_SUSPENDED =
  "Ce compte est suspendu et ne peut pas être utilisé ici. Contactez notre service client si vous pensez qu'il s'agit d'une erreur.";

export const ACCOUNT_UNKNOWN =
  "Ce compte est introuvable. Merci de lier à nouveau votre compte.";

export const ACCOUNT_STATE_UNAVAILABLE =
  "Nous n'avons pas pu vérifier votre compte. Merci de réessayer dans un instant.";

interface BanRow {
  banned: number | null;
  banExpires: string | null;
}

/**
 * `unavailable` is not the same as `active`: it means the read failed, so the
 * caller must refuse rather than assume the best. A ban that cannot be read is
 * not a ban that does not exist.
 */
export type AccountState = "active" | "banned" | "unknown" | "unavailable";

/**
 * Authoritative ban read, straight from the `user` row.
 *
 * The WhatsApp session row is not consulted and must not be: a session linked
 * before the ban would otherwise stay usable forever, since nothing in this
 * Worker ever revisits `whatsapp_sessions.is_verified`. The read is therefore
 * repeated on every privileged call, with nothing cached in between — one
 * indexed lookup by primary key.
 */
export async function readAccountState(
  db: D1Database,
  userId: string
): Promise<AccountState> {
  let row: BanRow | null;
  try {
    row = await db
      .prepare("SELECT banned, banExpires FROM user WHERE id = ?")
      .bind(userId)
      .first<BanRow>();
  } catch (err) {
    console.error(`[guards] ban lookup failed for user ${userId}`, err);
    return "unavailable";
  }

  if (!row) return "unknown";
  return isActivelyBanned(row) ? "banned" : "active";
}

export type ActiveCustomer =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * The gate in front of every tool that acts *as* a customer: placing an order,
 * reading that customer's orders.
 *
 * It subsumes the `is_verified === 1 && user_id` check those tools used to do
 * inline, and adds the ban read. An unverified session is refused first, with
 * `notLinkedError` and without a database read: there is no account to check,
 * because an unverified session has not proved it speaks for one. That also
 * means this guard does *not* stop a banned person from starting over from a
 * fresh, anonymous WhatsApp session — it stops them from acting on their
 * account. Nothing on this channel binds a person to an account before the
 * email OTP; the account is what carries the sanction.
 *
 * Browsing the catalogue, filling the WhatsApp cart and reaching a human agent
 * stay open, which is what the web does too: a banned customer can still browse
 * netereka.ci and fill a client-side cart, and only `requireAuth()`-gated pages
 * — account, checkout — turn them away. A conversational channel that refused
 * even a greeting would also leave the customer no way to be told why.
 */
export async function requireActiveCustomer(
  ctx: ToolContext,
  notLinkedError: string
): Promise<ActiveCustomer> {
  const userId = ctx.session.user_id;
  if (ctx.session.is_verified !== 1 || !userId) {
    return { ok: false, error: notLinkedError };
  }

  const state = await readAccountState(ctx.db, userId);
  switch (state) {
    case "active":
      return { ok: true, userId };
    case "banned":
      return { ok: false, error: ACCOUNT_SUSPENDED };
    case "unknown":
      return { ok: false, error: ACCOUNT_UNKNOWN };
    case "unavailable":
      return { ok: false, error: ACCOUNT_STATE_UNAVAILABLE };
  }
}
