import type { WhatsAppSession } from "./types";

export async function findOrCreateSession(
  db: D1Database,
  waPhone: string
): Promise<WhatsAppSession> {
  // Try to find existing session
  const existing = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE wa_phone = ?")
    .bind(waPhone)
    .first<WhatsAppSession>();

  if (existing) return existing;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Always create sessions UNLINKED and UNVERIFIED. Account linking must go
  // through the email-OTP flow (link_account + verifyOtp). We must NOT auto-link
  // or auto-verify from a user.phone match: phone is a self-asserted, unverified,
  // non-unique signup field, so trusting it would hand account access (order
  // history + order creation) to whoever controls a matching WhatsApp number
  // (e.g. telecom number recycling). See GHSA-4v42.
  // INSERT OR IGNORE to handle race condition (concurrent first messages).
  await db
    .prepare(
      `INSERT OR IGNORE INTO whatsapp_sessions (id, wa_phone, user_id, is_verified, status, created_at, updated_at)
       VALUES (?, ?, NULL, 0, 'active', ?, ?)`
    )
    .bind(id, waPhone, now, now)
    .run();

  // Always re-fetch by wa_phone (works whether our INSERT succeeded or was ignored)
  const session = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE wa_phone = ?")
    .bind(waPhone)
    .first<WhatsAppSession>();

  if (!session) {
    throw new Error(`[session] Failed to create or retrieve session for phone ${waPhone}`);
  }

  return session;
}
