"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { refundOrderStock } from "@/lib/db/orders";
import {
  getAdminOrders,
  getAdminOrderCount,
  type AdminOrderFilters,
} from "@/lib/db/admin/orders";
import { ordersToCSV } from "@/lib/csv/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  getStatusTimestampField,
} from "@/lib/constants/orders";
import type { ActionResult } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/db/types";

// Validation schemas
const idSchema = z.string().min(1, "ID requis");

const reasonSchema = z
  .string()
  .min(1, "La raison est requise")
  .max(1000, "La raison ne peut pas dépasser 1000 caractères")
  .trim();

const noteSchema = z
  .string()
  .max(2000, "La note ne peut pas dépasser 2000 caractères")
  .trim()
  .optional();

const notesSchema = z
  .string()
  .max(5000, "Les notes ne peuvent pas dépasser 5000 caractères")
  .trim();

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

  const noteResult = noteSchema.safeParse(note);
  if (!noteResult.success) {
    return { success: false, error: noteResult.error.issues[0].message };
  }

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const currentStatus = order.status as OrderStatus;
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus as OrderStatus)) {
    return {
      success: false,
      error: `Transition de "${ORDER_STATUS_LABELS[currentStatus]}" vers "${ORDER_STATUS_LABELS[newStatus as OrderStatus] || newStatus}" non autorisée`,
    };
  }

  const db = await getDB();

  // Get timestamp field for the new status
  const timestampField = getStatusTimestampField(newStatus as OrderStatus);

  if (timestampField) {
    await db
      .prepare(
        `UPDATE orders SET status = ?, ${timestampField} = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .bind(newStatus, orderId)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(newStatus, orderId)
      .run();
  }

  // Add history entry
  await addStatusHistory(
    orderId,
    currentStatus,
    newStatus,
    session.user.email,
    noteResult.data
  );

  // Refund stock for cancellations and returns
  // Note: Returns ALWAYS refund stock, even for delivered orders (items returned to warehouse)
  if (newStatus === "cancelled" || newStatus === "returned") {
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

  const notesResult = notesSchema.safeParse(notes);
  if (!notesResult.success) {
    return { success: false, error: notesResult.error.issues[0].message };
  }

  await execute(
    "UPDATE orders SET internal_notes = ?, updated_at = datetime('now') WHERE id = ?",
    [notesResult.data || null, orderId]
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

  // Validate that personId exists in users table if provided
  if (personId) {
    const user = await queryFirst<{ id: string }>(
      "SELECT id FROM users WHERE id = ?",
      [personId]
    );
    if (!user) {
      return { success: false, error: "Livreur introuvable" };
    }
  }

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

  const reasonResult = reasonSchema.safeParse(reason);
  if (!reasonResult.success) {
    return { success: false, error: reasonResult.error.issues[0].message };
  }

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const currentStatus = order.status as OrderStatus;
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes("cancelled")) {
    return {
      success: false,
      error: `Impossible d'annuler une commande avec le statut "${ORDER_STATUS_LABELS[currentStatus]}"`,
    };
  }

  await execute(
    `UPDATE orders SET
       status = 'cancelled',
       cancelled_at = datetime('now'),
       cancellation_reason = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    [reasonResult.data, orderId]
  );

  await addStatusHistory(
    orderId,
    currentStatus,
    "cancelled",
    session.user.email,
    reasonResult.data
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

  const reasonResult = reasonSchema.safeParse(reason);
  if (!reasonResult.success) {
    return { success: false, error: reasonResult.error.issues[0].message };
  }

  const order = await queryFirst<Order>("SELECT * FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!order) return { success: false, error: "Commande introuvable" };

  const currentStatus = order.status as OrderStatus;
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes("returned")) {
    return {
      success: false,
      error: `Impossible de retourner une commande avec le statut "${ORDER_STATUS_LABELS[currentStatus]}"`,
    };
  }

  await execute(
    `UPDATE orders SET
       status = 'returned',
       returned_at = datetime('now'),
       return_reason = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    [reasonResult.data, orderId]
  );

  await addStatusHistory(
    orderId,
    currentStatus,
    "returned",
    session.user.email,
    reasonResult.data
  );

  // Returns ALWAYS refund stock (items returned to warehouse)
  await refundOrderStock(orderId);

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

// Maximum number of orders to export at once
const MAX_EXPORT_LIMIT = 10000;

export async function exportOrdersCSV(
  filters: AdminOrderFilters
): Promise<{ success: boolean; csv?: string; error?: string; warning?: string }> {
  await requireAdmin();

  // Get total count to check if we need to warn about truncation
  const totalCount = await getAdminOrderCount(filters);

  if (totalCount === 0) {
    return { success: false, error: "Aucune commande à exporter" };
  }

  // Fetch orders up to the limit
  const orders = await getAdminOrders({
    ...filters,
    limit: MAX_EXPORT_LIMIT,
    offset: 0,
  });

  const csv = ordersToCSV(orders);

  // Warn if total count exceeds the limit
  const warning =
    totalCount > MAX_EXPORT_LIMIT
      ? `Export limité à ${MAX_EXPORT_LIMIT} commandes sur ${totalCount} trouvées. Utilisez des filtres pour réduire la sélection.`
      : undefined;

  return { success: true, csv, warning };
}
