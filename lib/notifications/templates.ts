import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

const BRAND_NAVY = "#183C78";
const BRAND_MINT = "#00FF9C";

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_NAVY};padding:24px 32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;">NETEREKA</span>
              <span style="font-size:12px;color:${BRAND_MINT};display:block;margin-top:2px;">Electronic</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#71717a;">NETEREKA Electronic &ndash; Abidjan, Côte d&rsquo;Ivoire</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;">Paiement à la livraison &bull; Livraison à Abidjan</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template: Order Confirmation (customer)
// ---------------------------------------------------------------------------

export interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  items: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  deliveryAddress: string;
  deliveryCommune: string;
  estimatedDelivery: string | null;
}

export function orderConfirmationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">
          ${escapeHtml(item.productName)}${item.variantName ? ` <span style="color:#71717a;">- ${escapeHtml(item.variantName)}</span>` : ""}
          <br/><span style="color:#71717a;font-size:12px;">x${item.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;text-align:right;white-space:nowrap;">
          ${formatPrice(item.totalPrice)}
        </td>
      </tr>`
    )
    .join("");

  const discountRow =
    data.discountAmount > 0
      ? `<tr>
          <td style="padding:4px 0;font-size:14px;color:#16a34a;">Réduction</td>
          <td style="padding:4px 0;font-size:14px;color:#16a34a;text-align:right;">-${formatPrice(data.discountAmount)}</td>
        </tr>`
      : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND_NAVY};">Merci pour votre commande !</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
      Bonjour ${escapeHtml(data.customerName)}, votre commande <strong>${escapeHtml(data.orderNumber)}</strong> a bien été enregistrée.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background-color:#f8fafc;border-radius:8px;">
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Adresse de livraison</p>
          <p style="margin:0;font-size:14px;color:#18181b;">${escapeHtml(data.deliveryAddress)}</p>
          ${data.estimatedDelivery ? `<p style="margin:4px 0 0;font-size:12px;color:#71717a;">Livraison estimée : ${new Date(data.estimatedDelivery).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</p>` : ""}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#71717a;">Sous-total</td>
        <td style="padding:4px 0;font-size:14px;color:#71717a;text-align:right;">${formatPrice(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#71717a;">Livraison</td>
        <td style="padding:4px 0;font-size:14px;color:#71717a;text-align:right;">${data.deliveryFee === 0 ? "Gratuite" : formatPrice(data.deliveryFee)}</td>
      </tr>
      ${discountRow}
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${BRAND_NAVY};border-top:2px solid ${BRAND_NAVY};">Total</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:${BRAND_NAVY};text-align:right;border-top:2px solid ${BRAND_NAVY};">${formatPrice(data.total)}</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="padding:16px;background-color:#fefce8;border-radius:8px;border:1px solid #fef08a;">
          <p style="margin:0;font-size:14px;color:#854d0e;">
            <strong>Paiement à la livraison</strong> — Préparez ${formatPrice(data.total)} en espèces pour le livreur.
          </p>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Commande ${escapeHtml(data.orderNumber)} confirmée - NETEREKA`,
    html: layout(`Commande ${data.orderNumber}`, body),
  };
}

// ---------------------------------------------------------------------------
// Template: Order Status Update (customer)
// ---------------------------------------------------------------------------

const STATUS_MESSAGES: Record<
  string,
  { title: string; message: (orderNumber: string, extra?: string) => string; color: string }
> = {
  confirmed: {
    title: "Commande confirmée",
    message: (n) =>
      `Votre commande <strong>${n}</strong> a été confirmée et sera bientôt préparée.`,
    color: "#2563eb",
  },
  preparing: {
    title: "Commande en préparation",
    message: (n) =>
      `Votre commande <strong>${n}</strong> est en cours de préparation.`,
    color: "#d97706",
  },
  shipping: {
    title: "Commande en livraison",
    message: (n, extra) =>
      `Votre commande <strong>${n}</strong> est en cours de livraison.${extra ? ` Votre livreur : <strong>${extra}</strong>.` : ""}`,
    color: "#7c3aed",
  },
  delivered: {
    title: "Commande livrée",
    message: (n) =>
      `Votre commande <strong>${n}</strong> a été livrée avec succès. Merci pour votre confiance !`,
    color: "#16a34a",
  },
  cancelled: {
    title: "Commande annulée",
    message: (n, extra) =>
      `Votre commande <strong>${n}</strong> a été annulée.${extra ? ` Raison : ${extra}` : ""}`,
    color: "#dc2626",
  },
  returned: {
    title: "Retour enregistré",
    message: (n, extra) =>
      `Le retour pour votre commande <strong>${n}</strong> a été enregistré.${extra ? ` Raison : ${extra}` : ""}`,
    color: "#dc2626",
  },
};

export interface StatusUpdateEmailData {
  customerName: string;
  orderNumber: string;
  newStatus: OrderStatus;
  deliveryPersonName?: string | null;
  reason?: string | null;
}

export function orderStatusUpdateEmail(data: StatusUpdateEmailData): {
  subject: string;
  html: string;
} | null {
  const config = STATUS_MESSAGES[data.newStatus];
  if (!config) return null;

  const escapedOrderNumber = escapeHtml(data.orderNumber);

  const extra =
    data.newStatus === "shipping"
      ? data.deliveryPersonName ? escapeHtml(data.deliveryPersonName) : undefined
      : data.newStatus === "cancelled" || data.newStatus === "returned"
        ? data.reason ? escapeHtml(data.reason) : undefined
        : undefined;

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background-color:${config.color};line-height:48px;text-align:center;">
        <span style="color:#ffffff;font-size:20px;">&#10003;</span>
      </div>
    </div>
    <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND_NAVY};text-align:center;">${config.title}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;text-align:center;">
      Bonjour ${escapeHtml(data.customerName)},
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;text-align:center;">
      ${config.message(escapedOrderNumber, extra)}
    </p>
    ${
      data.newStatus === "delivered"
        ? `<p style="margin:0;font-size:14px;color:#52525b;text-align:center;">
            N'hésitez pas à laisser un avis sur les produits que vous avez achetés.
          </p>`
        : ""
    }
  `;

  return {
    subject: `${config.title} - ${escapedOrderNumber}`,
    html: layout(config.title, body),
  };
}
