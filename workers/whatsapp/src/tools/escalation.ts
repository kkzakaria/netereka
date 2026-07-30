import type { ToolResult, ToolContext } from "../types";
import { WhatsAppAPI } from "../whatsapp-api";
// The same fixed-window KV counter the web limiters use (orders, promo codes,
// CSP reports). Reused rather than reimplemented: this Worker had already
// grown its own ad-hoc counters, and a third variant is a third place for the
// window semantics to drift. Pure module, no Next.js imports — see the `@/*`
// mapping note in workers/whatsapp/tsconfig.json.
import { checkKVRateLimit } from "../../../../lib/rate-limit/kv-window-limit";

/** Maximum number of code points of client text forwarded to staff. */
export const MAX_REASON_LEN = 200;

/**
 * Escalation ceiling per WhatsApp number.
 *
 * Deliberately generous rather than tight: an escalation is a rare, legitimate
 * event and the person triggering it is by definition someone the bot could
 * not help. Three per hour absorbs an anxious customer resending, and the
 * model calling the tool twice in one exchange, while still capping how many
 * pushes a single number can force onto every staff phone.
 */
export const ESCALATION_MAX_PER_WINDOW = 3;
export const ESCALATION_WINDOW_SECONDS = 3600;

/** A human was reached. */
const ESCALATED_MESSAGE =
  "Un conseiller va prendre le relais sous peu. Merci de votre patience.";

/**
 * Nobody could be reached. The customer must not be told to wait for someone
 * who was never notified, so this names a channel that does not depend on the
 * bot working.
 */
const UNREACHED_MESSAGE =
  "J'ai enregistré votre demande, mais je n'ai pas réussi à joindre un conseiller à l'instant. " +
  "Écrivez-nous depuis la page Contact du site netereka.ci, ou réessayez dans quelques minutes.";

/**
 * The ceiling was reached *and* an administrator was reached earlier in the
 * window, so saying the request was passed on is true. Never reads as a
 * refusal: a customer in difficulty is still pointed at a human.
 */
const THROTTLED_MESSAGE =
  "Votre demande a déjà été transmise, un conseiller vous répondra dès que possible. " +
  "Si c'est urgent, écrivez-nous depuis la page Contact du site netereka.ci.";

/**
 * The ceiling was reached and nothing says anyone was ever notified — the
 * customer whose earlier attempts all failed on infrastructure, i.e. exactly
 * the one for whom the alternative channel matters most. Claims nothing about
 * the request having been transmitted.
 */
const THROTTLED_UNREACHED_MESSAGE =
  "J'ai bien noté vos demandes, mais je n'ai pas réussi à joindre un conseiller. " +
  "Écrivez-nous depuis la page Contact du site netereka.ci : c'est le moyen le plus sûr de nous atteindre.";

const NO_REASON = "(aucune raison fournie)";

/**
 * KV key recording that at least one administrator acknowledged an escalation
 * from this number recently. The rate-limit slot is consumed *before* the
 * sends, so "throttled" carries no information about whether anyone was
 * notified; this marker is that information, and nothing else keeps it.
 */
const ACK_PREFIX = "wa:escalate:ack:";

// Built from escaped strings rather than written as regex literals so the
// source file stays plain ASCII: these ranges are invisible or control
// characters, and a literal one pasted into source is impossible to review and
// trivial to lose in an editor.
//
// Invisible formatting: bidi controls (which visually reorder the characters
// after them), zero-width spaces/joiners, and the BOM. They carry no meaning
// in an escalation reason and each one lets client text look like something it
// is not, so they are deleted outright rather than replaced by a space — a
// zero-width space inside a word must not split it.
const INVISIBLE_FORMATTING = new RegExp(
  "[\\u061c\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]",
  "g"
);
// C0 and C1 control characters. This is what covers \r, \n, \t, \v and the C1
// NEL (U+0085) — JavaScript's \s covers none of the C1 range.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");

/**
 * Flatten client-controlled text so it cannot imitate the structure of the
 * message that wraps it.
 *
 * `reason` is produced by the language model from what the customer typed, so
 * it is customer content arriving verbatim on a staff phone. Bounding its
 * length is not enough: what is forgeable is the *shape* of the alert. Three
 * things are neutralised, in this order:
 *
 *  - anything that renders as a line break (ASCII newlines, but also U+2028,
 *    U+2029, NEL, vertical tab), so the text can never occupy more than the
 *    one line reserved for it and can never start a line with `Client:`;
 *  - invisible and bidirectional formatting, which can hide or reverse text;
 *  - the guillemets used to delimit the quoted block, so the text cannot
 *    appear to close its own quotes and continue as if it were our own copy.
 *
 * What remains is a single line of plain text inside an explicitly labelled
 * block. Residual risk, accepted and documented: WhatsApp soft-wraps long
 * lines, so a reader skimming a wrapped block could still misread a fragment
 * as a field. The 200-code-point cap and the guillemets are what keep the
 * quoted region small and visibly bounded.
 */
function sanitiseClientText(raw: unknown): string {
  const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);

  const flattened = text
    .replace(INVISIBLE_FORMATTING, "")
    .replace(CONTROL_CHARS, " ")
    // Every remaining whitespace form, including U+2028/U+2029 and NBSP.
    .replace(/\s+/gu, " ")
    .replace(/[«»]/g, '"')
    // WhatsApp renders these inline: *bold*, _italic_, ~strike~, `mono`. Bold
    // and monospace are precisely how a fragment is made to look like a system
    // notice rather than a quote, so the markers are dropped and the text
    // stays flat. Legitimate reasons lose nothing but punctuation.
    .replace(/[*_~`]/g, "")
    .trim();

  if (flattened.length === 0) return NO_REASON;

  // Sliced by code point, not by UTF-16 unit: a naive slice can cut an emoji
  // in half and emit a lone surrogate. The ellipsis makes the truncation
  // visible, so staff can tell a cut-off message from a terse one.
  const points = Array.from(flattened);
  if (points.length <= MAX_REASON_LEN) return flattened;
  return points.slice(0, MAX_REASON_LEN - 1).join("") + "…";
}

/** Keep only what can legitimately appear in a WhatsApp number. */
function sanitisePhone(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

function sanitiseUserId(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return clean.length > 0 ? clean : "identifiant illisible";
}

/**
 * Build the alert a staff member reads. Exported so the flattening rules are
 * testable on their own, without a database or an API client.
 *
 * `account` is informational, not a gate: it tells the reader how much to
 * trust the sender instead of refusing to pass the message on. See the note
 * on the verification gate in escalateHuman.
 */
export function buildEscalationMessage(
  waPhone: string,
  reason: string,
  account?: { verified: boolean; userId: string | null }
): string {
  const phone = sanitisePhone(waPhone) || "inconnu";
  const accountLine =
    account?.verified && account.userId
      ? `Compte: vérifié (${sanitiseUserId(account.userId)})`
      : "Compte: non vérifié";

  return [
    "Escalade demandée",
    `Client: ${phone}`,
    accountLine,
    "--- message du client (non vérifié) ---",
    `« ${sanitiseClientText(reason)} »`,
    "--- fin du message ---",
  ].join("\n");
}

/**
 * Push the alert to every configured admin phone. Returns how many were
 * actually reached, so the caller can tell the customer the truth.
 *
 * Every step is guarded: a missing config row, malformed `admin_phones`, and a
 * network error mid-loop must each cost at most one admin, never the whole
 * escalation. `WhatsAppAPI.sendText` does not guard its own `fetch`, so an
 * unhandled rejection there would otherwise abort the loop.
 */
async function notifyAdmins(db: D1Database, alertMsg: string): Promise<number> {
  type ConfigRow = {
    phone_number_id: string;
    access_token: string;
    admin_phones: string | null;
  };

  let config: ConfigRow | null;
  try {
    config = await db
      .prepare("SELECT phone_number_id, access_token, admin_phones FROM whatsapp_config WHERE id = 1")
      .first<ConfigRow>();
  } catch (err) {
    console.error("[escalation] Could not read whatsapp_config:", err);
    return 0;
  }

  if (!config?.phone_number_id || !config.access_token) return 0;

  let parsed: unknown;
  try {
    parsed = JSON.parse(config.admin_phones ?? "[]");
  } catch {
    console.error("[escalation] Invalid admin_phones JSON in whatsapp_config");
    return 0;
  }

  const adminPhones = Array.isArray(parsed)
    ? parsed.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  if (adminPhones.length === 0) return 0;

  const api = new WhatsAppAPI(config.phone_number_id, config.access_token);
  let notified = 0;
  for (const phone of adminPhones) {
    try {
      const result = await api.sendText(phone, alertMsg);
      if (result.success) notified++;
      else console.error(`[escalation] Failed to notify admin ${phone}: ${result.error}`);
    } catch (err) {
      console.error(`[escalation] Failed to notify admin ${phone}:`, err);
    }
  }
  return notified;
}

export async function escalateHuman(
  ctx: ToolContext,
  params: { reason: string }
): Promise<ToolResult> {
  const { db, session, env } = ctx;

  // Record the request before anything else, and keep it recorded even when no
  // notification gets out. `status = 'escalated'` is a *record*, not a promise:
  // nothing in the bot gates on it, it exists so the admin conversation list
  // shows that this customer asked for a person. Rolling it back on a failed
  // send would delete the only trace of the request — which is why there is no
  // compensation here. What the earlier ordering actually got wrong is the
  // reply, and that is fixed at the bottom of this function: the customer is
  // told a conseiller is coming only when one was really notified.
  try {
    await db
      .prepare("UPDATE whatsapp_sessions SET status = 'escalated', updated_at = datetime('now') WHERE id = ?")
      .bind(session.id)
      .run();
  } catch (err) {
    console.error("[escalation] Could not mark session escalated:", err);
  }

  // No verification gate, deliberately. A customer who cannot link their
  // account is exactly the one who most needs a human, so requiring
  // verification to reach one would deny help precisely where it is needed —
  // and would not stop abuse anyway, since anyone willing to register clears
  // it. The abusable property is volume, not identity, so volume is what is
  // capped here; identity is reported to the reader instead of enforced.
  //
  // Keyed on the WhatsApp number rather than the session id: a session row is
  // trivial to churn, the number is what actually costs staff attention.
  //
  // The slot is consumed here, before the sends, and deliberately so: the
  // alternative — charging the slot only once an administrator has answered —
  // would stop the throttle bounding *attempts* and bound only successes. The
  // total-failure modes are an expired token, a Meta outage, or Meta rate
  // limiting us; those are precisely when repeated escalations would hammer
  // the Graph API hardest, when hammering helps least and can deepen the
  // outage. What that ordering costs is that "throttled" no longer implies
  // "someone was told" — paid for by the marker read below, not by loosening
  // the cap.
  const throttleKey = sanitisePhone(session.wa_phone) || `session:${session.id}`;
  let allowed = true;
  try {
    allowed = await checkKVRateLimit(env.KV, `wa:escalate:${throttleKey}`, {
      max: ESCALATION_MAX_PER_WINDOW,
      windowSeconds: ESCALATION_WINDOW_SECONDS,
    });
  } catch (err) {
    // Fails open, on purpose and only here: KV being unavailable is a
    // non-adversarial outage an abuser cannot induce, and closing this path
    // would cut off the help channel for everyone during it. Contrast with the
    // account guards, which fail closed because there the fallback grants
    // access to data.
    console.error("[escalation] Rate-limit check unavailable, letting the request through:", err);
  }

  if (!allowed) {
    // Throttled. Whether that means "a human already has this" or "three
    // attempts failed and nobody knows" depends on something the counter does
    // not record, so ask the marker — and treat an unreadable answer as the
    // pessimistic one. Reassurance is the claim that needs evidence; the
    // fallback channel costs nothing if it turns out to be unnecessary.
    let acknowledged = false;
    try {
      acknowledged = (await env.KV.get(`${ACK_PREFIX}${throttleKey}`)) !== null;
    } catch (err) {
      console.error("[escalation] Could not read the acknowledgement marker:", err);
    }
    return {
      success: true,
      data: { message: acknowledged ? THROTTLED_MESSAGE : THROTTLED_UNREACHED_MESSAGE },
    };
  }

  const alertMsg = buildEscalationMessage(session.wa_phone, params.reason, {
    verified: session.is_verified === 1 && Boolean(session.user_id),
    userId: session.user_id,
  });

  const notified = await notifyAdmins(db, alertMsg);

  // Remember that someone answered, so a later throttled attempt from this
  // number can tell the customer the truth. Written only on success and only
  // for the length of one window; a failure here costs nothing but the memory,
  // which the throttled branch already reads as "unknown", i.e. as no promise.
  //
  // The marker can outlive the counter's window by up to an hour. The
  // consequence of that staleness is benign: a customer throttled in the next
  // window whose sends all failed is told their request was passed on — which
  // is still true, an administrator was notified within the hour and knows
  // they want help.
  if (notified > 0) {
    try {
      await env.KV.put(`${ACK_PREFIX}${throttleKey}`, "1", {
        expirationTtl: ESCALATION_WINDOW_SECONDS,
      });
    } catch (err) {
      console.error("[escalation] Could not record the acknowledgement marker:", err);
    }
  }

  return {
    success: true,
    data: { message: notified > 0 ? ESCALATED_MESSAGE : UNREACHED_MESSAGE },
  };
}
