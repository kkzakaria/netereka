import type { AdminOrder } from "@/lib/db/types";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    preparing: "En préparation",
    shipping: "En livraison",
    delivered: "Livrée",
    cancelled: "Annulée",
    returned: "Retournée",
  };
  return statusMap[status] || status;
}

export function ordersToCSV(orders: AdminOrder[]): string {
  const headers = [
    "Numéro",
    "Date",
    "Client",
    "Email",
    "Téléphone",
    "Commune",
    "Adresse",
    "Sous-total",
    "Livraison",
    "Réduction",
    "Total",
    "Statut",
    "Articles",
  ];

  const rows = orders.map((order) => [
    escapeCSV(order.order_number),
    escapeCSV(formatDate(order.created_at)),
    escapeCSV(order.user_name),
    escapeCSV(order.user_email),
    escapeCSV(order.delivery_phone),
    escapeCSV(order.delivery_commune),
    escapeCSV(order.delivery_address),
    order.subtotal.toString(),
    order.delivery_fee.toString(),
    order.discount_amount.toString(),
    order.total.toString(),
    escapeCSV(formatStatus(order.status)),
    order.item_count.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}
