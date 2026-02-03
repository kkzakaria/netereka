"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { refundOrderStock } from "@/lib/db/orders";
import { getAdminOrders, type AdminOrderFilters } from "@/lib/db/admin/orders";
import { ordersToCSV } from "@/lib/csv/orders";
import type { ActionResult } from "@/lib/utils";
import type { Order } from "@/lib/db/types";

const idSchema = z.string().min(1, "ID requis");

// Status transition rules
const validTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipping", "cancelled"],
  shipping: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

async function addStatusHistory(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy: string,
  note?: string
): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(nanoid(), orderId, fromStatus, toStatus, changedBy, note || null)
    .run();
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(orderId);
  if (!idResult.success) return { success: false, error: "ID commande invalide" };

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const currentStatus = order.status;
  const allowed = validTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Transition de "${currentStatus}" vers "${newStatus}" non autorisée`,
    };
  }

  const db = await getDB();
  const statements: D1PreparedStatement[] = [];

  // Determine timestamp field to update
  const timestampField =
    newStatus === "confirmed"
      ? "confirmed_at"
      : newStatus === "preparing"
        ? "preparing_at"
        : newStatus === "shipping"
          ? "shipping_at"
          : newStatus === "delivered"
            ? "delivered_at"
            : newStatus === "returned"
              ? "returned_at"
              : newStatus === "cancelled"
                ? "cancelled_at"
                : null;

  if (timestampField) {
    statements.push(
      db
        .prepare(
          `UPDATE orders SET status = ?, ${timestampField} = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        )
        .bind(newStatus, orderId)
    );
  } else {
    statements.push(
      db
        .prepare(
          "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(newStatus, orderId)
    );
  }

  await db.batch(statements);

  // Add history entry
  await addStatusHistory(
    orderId,
    currentStatus,
    newStatus,
    session.user.email,
    note
  );

  // Refund stock if cancelled or returned (except for delivered orders that are cancelled - they shouldn't exist)
  if (
    newStatus === "cancelled" ||
    (newStatus === "returned" && currentStatus !== "delivered")
  ) {
    await refundOrderStock(orderId);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

export async function updateInternalNotes(
  orderId: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(orderId);
  if (!idResult.success) return { success: false, error: "ID commande invalide" };

  await execute(
    "UPDATE orders SET internal_notes = ?, updated_at = datetime('now') WHERE id = ?",
    [notes || null, orderId]
  );

  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

export async function assignDeliveryPerson(
  orderId: string,
  personId: string | null,
  personName: string | null
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(orderId);
  if (!idResult.success) return { success: false, error: "ID commande invalide" };

  await execute(
    "UPDATE orders SET delivery_person_id = ?, delivery_person_name = ?, updated_at = datetime('now') WHERE id = ?",
    [personId, personName, orderId]
  );

  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

export async function cancelOrderAdmin(
  orderId: string,
  reason: string,
  refundStock: boolean = true
): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(orderId);
  if (!idResult.success) return { success: false, error: "ID commande invalide" };

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes("cancelled")) {
    return {
      success: false,
      error: `Impossible d'annuler une commande avec le statut "${order.status}"`,
    };
  }

  await execute(
    `UPDATE orders SET
       status = 'cancelled',
       cancelled_at = datetime('now'),
       cancellation_reason = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    [reason, orderId]
  );

  await addStatusHistory(
    orderId,
    order.status,
    "cancelled",
    session.user.email,
    reason
  );

  if (refundStock) {
    await refundOrderStock(orderId);
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

export async function processReturn(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(orderId);
  if (!idResult.success) return { success: false, error: "ID commande invalide" };

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes("returned")) {
    return {
      success: false,
      error: `Impossible de retourner une commande avec le statut "${order.status}"`,
    };
  }

  await execute(
    `UPDATE orders SET
       status = 'returned',
       returned_at = datetime('now'),
       return_reason = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    [reason, orderId]
  );

  await addStatusHistory(
    orderId,
    order.status,
    "returned",
    session.user.email,
    reason
  );

  // Refund stock for returns
  await refundOrderStock(orderId);

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

export async function exportOrdersCSV(
  filters: AdminOrderFilters
): Promise<{ success: boolean; csv?: string; error?: string }> {
  await requireAdmin();

  // Fetch all orders matching filters (no pagination for export)
  const orders = await getAdminOrders({
    ...filters,
    limit: 10000,
    offset: 0,
  });

  if (orders.length === 0) {
    return { success: false, error: "Aucune commande à exporter" };
  }

  const csv = ordersToCSV(orders);
  return { success: true, csv };
}
