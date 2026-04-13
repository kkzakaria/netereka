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

  // Auto-link by phone number if a user matches
  const matchedUser = await db
    .prepare("SELECT id FROM user WHERE phone = ? OR phone = ?")
    .bind(waPhone, `+${waPhone}`)
    .first<{ id: string }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // INSERT OR IGNORE to handle race condition (concurrent first messages)
  await db
    .prepare(
      `INSERT OR IGNORE INTO whatsapp_sessions (id, wa_phone, user_id, is_verified, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, waPhone, matchedUser?.id ?? null, matchedUser ? 1 : 0, now, now)
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
