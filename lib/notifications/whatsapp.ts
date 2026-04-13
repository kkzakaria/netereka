import { getDB } from "@/lib/cloudflare/context";

interface OrderNotificationData {
  orderNumber: string;
  customerPhone: string;
  status: string;
  total?: number;
}

const STATUS_MESSAGES: Record<string, (data: OrderNotificationData) => string> = {
  confirmed: (d) =>
    `Votre commande *${d.orderNumber}* est confirmée. Montant : *${new Intl.NumberFormat("fr-FR").format(d.total ?? 0)} FCFA*.`,
  preparing: (d) =>
    `Votre commande *${d.orderNumber}* est en cours de préparation.`,
  shipping: (d) =>
    `Votre commande *${d.orderNumber}* est en route ! Notre livreur vous contactera bientôt.`,
  delivered: (d) =>
    `Votre commande *${d.orderNumber}* a été livrée. Merci pour votre confiance !`,
  cancelled: (d) =>
    `Votre commande *${d.orderNumber}* a été annulée. Contactez-nous pour plus d'informations.`,
  returned: (d) =>
    `Le retour de votre commande *${d.orderNumber}* a été traité.`,
};

export async function notifyOrderStatusWhatsApp(
  data: OrderNotificationData
): Promise<void> {
  const messageFn = STATUS_MESSAGES[data.status];
  if (!messageFn) return;

  try {
    const db = await getDB();
    const config = await db
      .prepare(
        "SELECT phone_number_id, access_token, is_active FROM whatsapp_config WHERE id = 1"
      )
      .first<{ phone_number_id: string; access_token: string; is_active: number }>();

    if (!config || !config.is_active) return;

    // Normalize phone: remove + prefix if present
    const normalizedPhone = data.customerPhone.replace(/^\+/, "");

    // Check if customer has a verified WhatsApp session
    const session = await db
      .prepare(
        "SELECT id FROM whatsapp_sessions WHERE wa_phone = ? AND is_verified = 1"
      )
      .bind(normalizedPhone)
      .first<{ id: string }>();

    if (!session) return;

    const message = messageFn(data);

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      console.error(
        `[whatsapp-notifications] API error for ${data.orderNumber} to ${normalizedPhone}: ${response.status} ${body}`
      );
    }
  } catch (error) {
    console.error(
      `[whatsapp-notifications] Failed to send status update for ${data.orderNumber}:`,
      error
    );
  }
}
