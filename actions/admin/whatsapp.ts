"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { getDB } from "@/lib/cloudflare/context";
import type { ActionResult } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppConfig {
  id: number;
  phone_number_id: string | null;
  display_phone_number: string | null;
  access_token: string | null;
  verify_token: string | null;
  webhook_secret: string | null;
  business_account_id: string | null;
  admin_phones: string; // JSON array string
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  wa_phone: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  is_verified: number;
  status: "active" | "escalated" | "closed";
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
}

export interface MessageItem {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  message_type: string;
  created_at: string;
}

export interface WhatsAppStats {
  conversations: {
    total: number;
    active: number;
    escalated: number;
    closed: number;
  };
  messages: {
    total: number;
    inbound: number;
    outbound: number;
  };
  orders: {
    whatsapp_count: number;
    whatsapp_revenue: number;
    web_count: number;
    web_revenue: number;
  };
}

// ---------------------------------------------------------------------------
// Config Actions
// ---------------------------------------------------------------------------

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return "••••••••" + value.slice(-4);
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  await requireAdmin();

  try {
    const db = await getDB();
    const row = await db
      .prepare("SELECT * FROM whatsapp_config WHERE id = 1")
      .first<WhatsAppConfig>();
    if (!row) return null;
    // Mask sensitive fields — secrets are write-only
    return {
      ...row,
      access_token: row.access_token ? maskSecret(row.access_token) : null,
      webhook_secret: row.webhook_secret ? maskSecret(row.webhook_secret) : null,
    };
  } catch (error) {
    console.error("[admin/whatsapp] getWhatsAppConfig error:", error);
    return null;
  }
}

export async function saveWhatsAppConfig(
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const phone_number_id_raw = String(formData.get("phone_number_id") ?? "").trim();
  const phone_number_id = phone_number_id_raw || null;

  const display_phone_number_raw = String(formData.get("display_phone_number") ?? "").trim();
  // Normalize: keep digits only (strips +, spaces, dashes, dots)
  const display_phone_number_normalized = display_phone_number_raw.replace(/\D/g, "");
  const display_phone_number = display_phone_number_normalized || null;

  // Validate E.164-ish format: 8-15 digits (ITU-T E.164 max is 15)
  if (display_phone_number && !/^\d{8,15}$/.test(display_phone_number)) {
    return {
      success: false,
      error: "Le numéro public doit contenir entre 8 et 15 chiffres (format international, ex: 2250700000001).",
    };
  }

  const access_token_raw = String(formData.get("access_token") ?? "").trim();
  const verify_token_raw = String(formData.get("verify_token") ?? "").trim();
  const webhook_secret_raw = String(formData.get("webhook_secret") ?? "").trim();
  const business_account_id_raw = String(formData.get("business_account_id") ?? "").trim();
  const business_account_id = business_account_id_raw || null;
  const admin_phones_raw = String(formData.get("admin_phones") ?? "").trim();
  const is_active = formData.get("is_active") === "1" ? 1 : 0;

  // Validate admin_phones is a valid JSON array (if provided)
  let admin_phones = "[]";
  if (admin_phones_raw) {
    try {
      const parsed = JSON.parse(admin_phones_raw);
      if (!Array.isArray(parsed)) {
        return {
          success: false,
          error: "admin_phones doit être un tableau JSON valide.",
        };
      }
      admin_phones = JSON.stringify(parsed);
    } catch {
      return {
        success: false,
        error: "admin_phones doit être un tableau JSON valide.",
      };
    }
  }

  try {
    const db = await getDB();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    // Read existing row once — used for mask detection, validation, and existence check.
    const existingRow = await db
      .prepare("SELECT id, access_token, webhook_secret FROM whatsapp_config WHERE id = 1")
      .first<{ id: number; access_token: string | null; webhook_secret: string | null }>();

    // Detect masked values by exact equality with the mask we would have sent to the client.
    // Avoids false positives if a real secret happens to start with bullet characters.
    const expectedMaskedAccessToken = existingRow?.access_token ? maskSecret(existingRow.access_token) : null;
    const expectedMaskedWebhookSecret = existingRow?.webhook_secret ? maskSecret(existingRow.webhook_secret) : null;
    const accessTokenMasked = expectedMaskedAccessToken !== null && access_token_raw === expectedMaskedAccessToken;
    const webhookSecretMasked = expectedMaskedWebhookSecret !== null && webhook_secret_raw === expectedMaskedWebhookSecret;

    // Final values (null if empty, undefined if masked to preserve existing)
    const access_token = accessTokenMasked ? undefined : (access_token_raw || null);
    const verify_token = verify_token_raw || null;
    const webhook_secret = webhookSecretMasked ? undefined : (webhook_secret_raw || null);

    // If bot is being activated, require full API credentials (check effective values against DB).
    if (is_active === 1) {
      const effectiveAccessToken = accessTokenMasked ? existingRow?.access_token ?? null : access_token;
      const effectiveWebhookSecret = webhookSecretMasked ? existingRow?.webhook_secret ?? null : webhook_secret;

      if (!phone_number_id || !effectiveAccessToken || !verify_token || !effectiveWebhookSecret || !business_account_id) {
        return {
          success: false,
          error:
            "Pour activer le bot, renseignez phone_number_id, access_token, verify_token, webhook_secret et business_account_id.",
        };
      }
    }

    const existing = existingRow ? { id: existingRow.id } : null;

    if (existing) {
      // For masked secrets (access_token/webhook_secret = undefined), preserve existing DB values
      const setClauses = [
        "phone_number_id = ?",
        "display_phone_number = ?",
        access_token !== undefined ? "access_token = ?" : "",
        "verify_token = ?",
        webhook_secret !== undefined ? "webhook_secret = ?" : "",
        "business_account_id = ?",
        "admin_phones = ?",
        "is_active = ?",
        "updated_at = ?",
      ].filter(Boolean).join(", ");

      const bindings: unknown[] = [phone_number_id, display_phone_number];
      if (access_token !== undefined) bindings.push(access_token);
      bindings.push(verify_token);
      if (webhook_secret !== undefined) bindings.push(webhook_secret);
      bindings.push(business_account_id, admin_phones, is_active, now);

      // Atomic guard: when activating the bot, require existing creds to still be non-null
      // at write time. Prevents a race where another admin nulls a cred between our SELECT
      // and our UPDATE. The WHERE clauses only apply to masked fields (for unmasked values
      // we're writing a new value directly, so the constraint is already satisfied).
      const whereExtras: string[] = [];
      if (is_active === 1) {
        if (accessTokenMasked) whereExtras.push("access_token IS NOT NULL");
        if (webhookSecretMasked) whereExtras.push("webhook_secret IS NOT NULL");
      }
      const whereClause = ["id = 1", ...whereExtras].join(" AND ");

      const result = await db
        .prepare(`UPDATE whatsapp_config SET ${setClauses} WHERE ${whereClause}`)
        .bind(...bindings)
        .run();

      if (is_active === 1 && result.meta.changes === 0) {
        return {
          success: false,
          error:
            "Impossible d'activer le bot : les identifiants API ont été modifiés entre-temps. Rechargez la page et réessayez.",
        };
      }
    } else {
      await db
        .prepare(
          `INSERT INTO whatsapp_config
             (id, phone_number_id, display_phone_number, access_token, verify_token, webhook_secret,
              business_account_id, admin_phones, is_active, created_at, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          phone_number_id,
          display_phone_number,
          access_token ?? null,
          verify_token,
          webhook_secret ?? null,
          business_account_id,
          admin_phones,
          is_active,
          now,
          now
        )
        .run();
    }

    revalidatePath("/whatsapp");
    revalidatePath("/", "layout"); // storefront uses display_phone_number
    return { success: true };
  } catch (error) {
    console.error("[admin/whatsapp] saveWhatsAppConfig error:", error);
    return {
      success: false,
      error: "Erreur lors de la sauvegarde de la configuration.",
    };
  }
}

// ---------------------------------------------------------------------------
// Conversation Actions
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export async function getConversations(params: {
  search?: string;
  status?: string;
  page?: number;
}): Promise<{
  items: ConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (params.status && ["active", "escalated", "closed"].includes(params.status)) {
    conditions.push("ws.status = ?");
    bindings.push(params.status);
  }

  if (params.search) {
    const like = `%${params.search}%`;
    conditions.push(
      "(ws.wa_phone LIKE ? OR u.name LIKE ? OR u.email LIKE ?)"
    );
    bindings.push(like, like, like);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const db = await getDB();

    const countRow = await db
      .prepare(
        `SELECT COUNT(*) AS cnt
         FROM whatsapp_sessions ws
         LEFT JOIN user u ON u.id = ws.user_id
         ${where}`
      )
      .bind(...bindings)
      .first<{ cnt: number }>();

    const total = countRow?.cnt ?? 0;

    const rows = await db
      .prepare(
        `SELECT
           ws.id,
           ws.wa_phone,
           ws.user_id,
           u.name  AS user_name,
           u.email AS user_email,
           ws.is_verified,
           ws.status,
           ws.created_at,
           ws.updated_at,
           (
             SELECT wm.content
             FROM whatsapp_messages wm
             WHERE wm.session_id = ws.id
             ORDER BY wm.created_at DESC
             LIMIT 1
           ) AS last_message,
           (
             SELECT wm.created_at
             FROM whatsapp_messages wm
             WHERE wm.session_id = ws.id
             ORDER BY wm.created_at DESC
             LIMIT 1
           ) AS last_message_at,
           (
             SELECT COUNT(*)
             FROM whatsapp_messages wm
             WHERE wm.session_id = ws.id
           ) AS message_count
         FROM whatsapp_sessions ws
         LEFT JOIN user u ON u.id = ws.user_id
         ${where}
         ORDER BY ws.updated_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, PAGE_SIZE, offset)
      .all<ConversationListItem>();

    return {
      items: rows.results ?? [],
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    console.error("[admin/whatsapp] getConversations error:", error);
    return { items: [], total: 0, page, pageSize: PAGE_SIZE };
  }
}

export async function getConversationMessages(sessionId: string): Promise<{
  session: ConversationListItem | null;
  messages: MessageItem[];
}> {
  await requireAdmin();

  if (!sessionId) return { session: null, messages: [] };

  try {
    const db = await getDB();

    const session = await db
      .prepare(
        `SELECT
           ws.id,
           ws.wa_phone,
           ws.user_id,
           u.name  AS user_name,
           u.email AS user_email,
           ws.is_verified,
           ws.status,
           ws.created_at,
           ws.updated_at,
           NULL AS last_message,
           NULL AS last_message_at,
           0    AS message_count
         FROM whatsapp_sessions ws
         LEFT JOIN user u ON u.id = ws.user_id
         WHERE ws.id = ?`
      )
      .bind(sessionId)
      .first<ConversationListItem>();

    if (!session) return { session: null, messages: [] };

    const msgs = await db
      .prepare(
        `SELECT id, direction, content, message_type, created_at
         FROM whatsapp_messages
         WHERE session_id = ?
         ORDER BY created_at ASC`
      )
      .bind(sessionId)
      .all<MessageItem>();

    return { session, messages: msgs.results ?? [] };
  } catch (error) {
    console.error("[admin/whatsapp] getConversationMessages error:", error);
    return { session: null, messages: [] };
  }
}

export async function sendAdminMessage(
  sessionId: string,
  message: string
): Promise<ActionResult> {
  await requireAdmin();

  if (!sessionId || !message.trim()) {
    return { success: false, error: "Session ou message invalide." };
  }

  try {
    const db = await getDB();

    // Get session to retrieve wa_phone
    const session = await db
      .prepare(
        "SELECT id, wa_phone FROM whatsapp_sessions WHERE id = ?"
      )
      .bind(sessionId)
      .first<{ id: string; wa_phone: string }>();

    if (!session) {
      return { success: false, error: "Session introuvable." };
    }

    // Get WhatsApp config
    const config = await db
      .prepare(
        "SELECT phone_number_id, access_token FROM whatsapp_config WHERE id = 1"
      )
      .first<{ phone_number_id: string | null; access_token: string | null }>();

    if (!config || !config.phone_number_id || !config.access_token) {
      return {
        success: false,
        error:
          "L'intégration API WhatsApp n'est pas configurée. Renseignez phone_number_id et access_token dans la configuration.",
      };
    }

    // Send via WhatsApp Cloud API
    const apiUrl = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: session.wa_phone,
        type: "text",
        text: { body: message.trim() },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[admin/whatsapp] sendAdminMessage API error:", err);
      return {
        success: false,
        error: "Échec de l'envoi du message WhatsApp.",
      };
    }

    const apiData = (await response.json()) as {
      messages?: { id: string }[];
    };
    const waMessageId = apiData.messages?.[0]?.id ?? null;

    // Log message to DB
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const msgId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO whatsapp_messages
           (id, session_id, wa_message_id, direction, content, message_type, metadata, created_at)
         VALUES (?, ?, ?, 'outbound', ?, 'text', NULL, ?)`
      )
      .bind(msgId, sessionId, waMessageId, message.trim(), now)
      .run();

    // Update session updated_at
    await db
      .prepare(
        "UPDATE whatsapp_sessions SET updated_at = ? WHERE id = ?"
      )
      .bind(now, sessionId)
      .run();

    revalidatePath(`/whatsapp/conversations/${sessionId}`);
    revalidatePath("/whatsapp");
    return { success: true };
  } catch (error) {
    console.error("[admin/whatsapp] sendAdminMessage error:", error);
    return { success: false, error: "Erreur lors de l'envoi du message." };
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: "active" | "escalated" | "closed"
): Promise<ActionResult> {
  await requireAdmin();

  if (!sessionId) return { success: false, error: "Session invalide." };
  if (!["active", "escalated", "closed"].includes(status)) {
    return { success: false, error: "Statut invalide." };
  }

  try {
    const db = await getDB();

    const existing = await db
      .prepare("SELECT id FROM whatsapp_sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ id: string }>();

    if (!existing) {
      return { success: false, error: "Session introuvable." };
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    await db
      .prepare(
        "UPDATE whatsapp_sessions SET status = ?, updated_at = ? WHERE id = ?"
      )
      .bind(status, now, sessionId)
      .run();

    revalidatePath(`/whatsapp/conversations/${sessionId}`);
    revalidatePath("/whatsapp");
    return { success: true };
  } catch (error) {
    console.error("[admin/whatsapp] updateSessionStatus error:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour du statut.",
    };
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getWhatsAppStats(
  period: "7d" | "30d" | "90d"
): Promise<WhatsAppStats> {
  await requireAdmin();

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  const empty: WhatsAppStats = {
    conversations: { total: 0, active: 0, escalated: 0, closed: 0 },
    messages: { total: 0, inbound: 0, outbound: 0 },
    orders: {
      whatsapp_count: 0,
      whatsapp_revenue: 0,
      web_count: 0,
      web_revenue: 0,
    },
  };

  try {
    const db = await getDB();

    // Run 3 queries in parallel via batch
    const [convResults, msgResults, orderResults] = await db.batch([
      db.prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
           SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) AS escalated,
           SUM(CASE WHEN status = 'closed'    THEN 1 ELSE 0 END) AS closed
         FROM whatsapp_sessions
         WHERE created_at >= ?`
      ).bind(since),

      db.prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN direction = 'inbound'  THEN 1 ELSE 0 END) AS inbound,
           SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound
         FROM whatsapp_messages
         WHERE created_at >= ?`
      ).bind(since),

      db.prepare(
        `SELECT
           SUM(CASE WHEN channel = 'whatsapp' THEN 1         ELSE 0 END) AS whatsapp_count,
           SUM(CASE WHEN channel = 'whatsapp' THEN total     ELSE 0 END) AS whatsapp_revenue,
           SUM(CASE WHEN channel = 'web'      THEN 1         ELSE 0 END) AS web_count,
           SUM(CASE WHEN channel = 'web'      THEN total     ELSE 0 END) AS web_revenue
         FROM orders
         WHERE created_at >= ?`
      ).bind(since),
    ]);

    type ConvRow = {
      total: number;
      active: number;
      escalated: number;
      closed: number;
    };
    type MsgRow = { total: number; inbound: number; outbound: number };
    type OrderRow = {
      whatsapp_count: number;
      whatsapp_revenue: number;
      web_count: number;
      web_revenue: number;
    };

    const conv = (convResults.results?.[0] as ConvRow | undefined) ?? {
      total: 0,
      active: 0,
      escalated: 0,
      closed: 0,
    };
    const msg = (msgResults.results?.[0] as MsgRow | undefined) ?? {
      total: 0,
      inbound: 0,
      outbound: 0,
    };
    const ord = (orderResults.results?.[0] as OrderRow | undefined) ?? {
      whatsapp_count: 0,
      whatsapp_revenue: 0,
      web_count: 0,
      web_revenue: 0,
    };

    return {
      conversations: {
        total: conv.total ?? 0,
        active: conv.active ?? 0,
        escalated: conv.escalated ?? 0,
        closed: conv.closed ?? 0,
      },
      messages: {
        total: msg.total ?? 0,
        inbound: msg.inbound ?? 0,
        outbound: msg.outbound ?? 0,
      },
      orders: {
        whatsapp_count: ord.whatsapp_count ?? 0,
        whatsapp_revenue: ord.whatsapp_revenue ?? 0,
        web_count: ord.web_count ?? 0,
        web_revenue: ord.web_revenue ?? 0,
      },
    };
  } catch (error) {
    console.error("[admin/whatsapp] getWhatsAppStats error:", error);
    return empty;
  }
}
