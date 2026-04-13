import type { ToolResult, ToolContext } from "../types";
import { WhatsAppAPI } from "../whatsapp-api";

export async function escalateHuman(
  ctx: ToolContext,
  params: { reason: string }
): Promise<ToolResult> {
  const { db, session } = ctx;

  // Mark session as escalated
  await db
    .prepare("UPDATE whatsapp_sessions SET status = 'escalated', updated_at = datetime('now') WHERE id = ?")
    .bind(session.id)
    .run();

  // Notify admin phones via WhatsApp
  const config = await db
    .prepare("SELECT phone_number_id, access_token, admin_phones FROM whatsapp_config WHERE id = 1")
    .first<{ phone_number_id: string; access_token: string; admin_phones: string }>();

  if (config) {
    let adminPhones: string[] = [];
    try {
      adminPhones = JSON.parse(config.admin_phones) as string[];
    } catch {
      console.error("[escalation] Invalid admin_phones JSON in whatsapp_config");
    }

    if (adminPhones.length > 0) {
      const api = new WhatsAppAPI(config.phone_number_id, config.access_token);
      const alertMsg = `Escalade demandée\nClient: ${session.wa_phone}\nRaison: ${params.reason}`;
      for (const phone of adminPhones) {
        const result = await api.sendText(phone, alertMsg);
        if (!result.success) {
          console.error(`[escalation] Failed to notify admin ${phone}: ${result.error}`);
        }
      }
    }
  }

  return {
    success: true,
    data: { message: "Un conseiller va prendre le relais sous peu. Merci de votre patience." },
  };
}
