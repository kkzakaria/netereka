"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { refundOrderStock, cancelOrderFromStatus } from "@/lib/db/orders";
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
import { notifyOrderStatusUpdate } from "@/lib/notifications";
import { notifyOrderStatusWhatsApp } from "@/lib/notifications/whatsapp";

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

async function getOrderCustomer(
  userId: string
): Promise<{ email: string; name: string; phone: string | null } | null> {
  return queryFirst<{ email: string; name: string; phone: string | null }>(
    "SELECT email, name, phone FROM user WHERE id = ?",
    [userId]
  );
}

function sendStatusNotification(
  order: Order,
  newStatus: OrderStatus,
  customer: { email: string; name: string; phone?: string | null },
  extra?: { deliveryPersonName?: string | null; reason?: string | null }
): void {
  notifyOrderStatusUpdate(customer.email, {
    customerName: customer.name,
    orderNumber: order.order_number,
    newStatus,
    deliveryPersonName: extra?.deliveryPersonName,
    reason: extra?.reason,
  }).catch((err) =>
    console.error("[admin/orders] notification error:", err)
  );
}

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
  const nextStatus = newStatus as OrderStatus;
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    return {
      success: false,
      error: `Transition de "${ORDER_STATUS_LABELS[currentStatus]}" vers "${ORDER_STATUS_LABELS[nextStatus] || newStatus}" non autorisée`,
    };
  }

  const db = await getDB();

  // Get timestamp field for the new status
  const timestampField = getStatusTimestampField(nextStatus);

  // Guarded transition: "AND status = ?" bound to currentStatus (read just
  // above) means this UPDATE can affect the row at most once, no matter how
  // many callers race to change it concurrently — another admin tab acting
  // on the same order, or, for a pending order, the hourly stale-order sweep
  // cancelling it out from under this call. Without this predicate, a lost
  // race would silently re-run history/refund/notification against a row
  // this call never actually transitioned, which is exactly the shape that
  // let an admin cancel double-refund stock the sweep had already returned.
  const updateResult = timestampField
    ? await db
        .prepare(
          `UPDATE orders SET status = ?, ${timestampField} = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = ?`
        )
        .bind(newStatus, orderId, currentStatus)
        .run()
    : await db
        .prepare(
          "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = ?"
        )
        .bind(newStatus, orderId, currentStatus)
        .run();

  if (!(updateResult.meta.changes > 0)) {
    return {
      success: false,
      error: `La commande a changé de statut entre-temps (attendu "${ORDER_STATUS_LABELS[currentStatus]}"). Merci de rafraîchir la page.`,
    };
  }

  // Refund stock for cancellations and returns.
  // Note: Returns ALWAYS refund stock, even for delivered orders (items returned to warehouse)
  if (nextStatus === "cancelled" || nextStatus === "returned") {
    try {
      await refundOrderStock(orderId);
    } catch (err) {
      // Compensate: revert the transition so a failed refund never leaves a
      // cancelled/returned order with its stock silently unreturned. The
      // status guard above means only this call performed the transition,
      // so the revert targets exactly the row this call just changed. The
      // revert itself gets its own try/catch: it is a second, independent D1
      // call and can fail on its own, in which case it must not escape this
      // Server Action as an unhandled error — the caller still needs a
      // structured ActionResult, and the wording must be honest about which
      // of the two very different outcomes actually happened.
      try {
        await db
          .prepare(
            `UPDATE orders SET status = ?${timestampField ? `, ${timestampField} = NULL` : ""}, updated_at = datetime('now') WHERE id = ? AND status = ?`
          )
          .bind(currentStatus, orderId, newStatus)
          .run();
      } catch (revertErr) {
        console.error(
          "updateOrderStatus: stock refund failed AND compensating revert also failed — order left stuck",
          { orderId, stuckStatus: newStatus, intendedRevertTo: currentStatus },
          err,
          revertErr
        );
        return {
          success: false,
          error:
            "Échec du remboursement du stock et échec de la tentative d'annulation du changement de statut : la commande est restée au nouveau statut sans que le stock ait été remboursé. Une vérification manuelle est nécessaire.",
        };
      }
      console.error(
        "updateOrderStatus: stock refund failed, reverted",
        { orderId, revertedTo: currentStatus },
        err
      );
      return {
        success: false,
        error: "Échec du remboursement du stock ; la commande a été remise à son statut précédent.",
      };
    }
  }

  // Add history entry — only reached once the transition (and any required
  // refund) has actually succeeded, so history never records a change that
  // was reverted above.
  await addStatusHistory(
    orderId,
    currentStatus,
    newStatus,
    session.user.email,
    noteResult.data
  );

  // Notify customer (fire-and-forget)
  const customer = await getOrderCustomer(order.user_id);
  if (customer) {
    sendStatusNotification(order, nextStatus, customer, {
      deliveryPersonName: order.delivery_person_name,
      reason: noteResult.data,
    });
  }

  // WhatsApp notification (fire-and-forget)
  if (customer?.phone) {
    notifyOrderStatusWhatsApp({
      orderNumber: order.order_number,
      customerPhone: customer.phone,
      status: newStatus,
      total: order.total,
    });
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
      "SELECT id FROM user WHERE id = ?",
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

  // Reuses the same guarded transition the customer self-cancel path and
  // the stale-pending sweep use (see lib/db/orders.ts::cancelOrderFromStatus's
  // doc comment) — its "AND status = ?" predicate, bound to currentStatus
  // read above, means this call can only ever cancel-and-refund a row it
  // actually transitioned itself. Without it, an admin cancelling a pending
  // order the hourly sweep had already cancelled moments earlier would run
  // its UPDATE unconditionally and call refundOrderStock a second time over
  // the same order_items — the exact double-refund race this guard closes.
  const cancelled = await cancelOrderFromStatus(orderId, currentStatus, reasonResult.data, {
    refund: refundStock,
  });

  if (!cancelled) {
    return {
      success: false,
      error:
        "La commande a changé de statut entre-temps (ou le remboursement du stock a échoué). Merci de rafraîchir la page.",
    };
  }

  await addStatusHistory(
    orderId,
    currentStatus,
    "cancelled",
    session.user.email,
    reasonResult.data
  );

  // Notify customer (fire-and-forget)
  const customer = await getOrderCustomer(order.user_id);
  if (customer) {
    sendStatusNotification(order, "cancelled", customer, {
      reason: reasonResult.data,
    });
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

  // Guarded transition: "AND status = ?" bound to currentStatus means this
  // UPDATE can affect the row at most once, even if another admin action (or,
  // for a currentStatus that could also be reached via the sweep — not the
  // case for "returned" today, but the same discipline as the other
  // transitions above) races this same order concurrently.
  const updateResult = await execute(
    `UPDATE orders SET
       status = 'returned',
       returned_at = datetime('now'),
       return_reason = ?,
       updated_at = datetime('now')
     WHERE id = ? AND status = ?`,
    [reasonResult.data, orderId, currentStatus]
  );

  if (!(updateResult.meta.changes > 0)) {
    return {
      success: false,
      error: `La commande a changé de statut entre-temps (attendu "${ORDER_STATUS_LABELS[currentStatus]}"). Merci de rafraîchir la page.`,
    };
  }

  // Returns ALWAYS refund stock (items returned to warehouse)
  try {
    await refundOrderStock(orderId);
  } catch (err) {
    // Compensate: revert to the prior status so a failed refund never
    // leaves a "returned" order with its stock silently unreturned. The
    // revert is a second, independent D1 call and gets its own try/catch so
    // its failure can never escape this Server Action unhandled — the caller
    // still needs a structured ActionResult, and the message must be honest
    // about whether the revert actually happened.
    try {
      await execute(
        `UPDATE orders SET status = ?, returned_at = NULL, return_reason = NULL, updated_at = datetime('now')
         WHERE id = ? AND status = 'returned'`,
        [currentStatus, orderId]
      );
    } catch (revertErr) {
      console.error(
        "processReturn: stock refund failed AND compensating revert also failed — order left stuck",
        { orderId, stuckStatus: "returned", intendedRevertTo: currentStatus },
        err,
        revertErr
      );
      return {
        success: false,
        error:
          "Échec du remboursement du stock et échec de la tentative d'annulation du retour : la commande est restée au statut « retournée » sans que le stock ait été remboursé. Une vérification manuelle est nécessaire.",
      };
    }
    console.error(
      "processReturn: stock refund failed, reverted",
      { orderId, revertedTo: currentStatus },
      err
    );
    return {
      success: false,
      error: "Échec du remboursement du stock ; la commande a été remise à son statut précédent.",
    };
  }

  await addStatusHistory(
    orderId,
    currentStatus,
    "returned",
    session.user.email,
    reasonResult.data
  );

  // Notify customer (fire-and-forget)
  const customer = await getOrderCustomer(order.user_id);
  if (customer) {
    sendStatusNotification(order, "returned", customer, {
      reason: reasonResult.data,
    });
  }

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
