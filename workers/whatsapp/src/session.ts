import type { WhatsAppSession } from "./types";

export async function findOrCreateSession(
  db: D1Database,
  waPhone: string
): Promise<WhatsAppSession> {
  const existing = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE wa_phone = ?")
    .bind(waPhone)
    .first<WhatsAppSession>();

  if (existing) return existing;

  const matchedUser = await db
    .prepare("SELECT id FROM user WHERE phone = ? OR phone = ?")
    .bind(waPhone, formatPhoneVariant(waPhone))
    .first<{ id: string }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO whatsapp_sessions (id, wa_phone, user_id, is_verified, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, waPhone, matchedUser?.id ?? null, matchedUser ? 1 : 0, now, now)
    .run();

  const session = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE id = ?")
    .bind(id)
    .first<WhatsAppSession>();

  return session!;
}

function formatPhoneVariant(waPhone: string): string {
  return `+${waPhone}`;
}
