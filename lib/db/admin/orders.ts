import { query, queryFirst } from "@/lib/db";
import type {
  Order,
  OrderItem,
  OrderStatusHistory,
  AdminOrder,
  AdminOrderDetail,
} from "@/lib/db/types";

export interface AdminOrderFilters {
  search?: string;
  status?: string;
  commune?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest" | "total_asc" | "total_desc";
  limit?: number;
  offset?: number;
}

function buildFilterClause(opts: AdminOrderFilters): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push(
      "(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR o.delivery_phone LIKE ?)"
    );
    const term = `%${opts.search}%`;
    params.push(term, term, term, term);
  }

  if (opts.status && opts.status !== "all") {
    conditions.push("o.status = ?");
    params.push(opts.status);
  }

  if (opts.commune) {
    conditions.push("o.delivery_commune = ?");
    params.push(opts.commune);
  }

  if (opts.dateFrom) {
    conditions.push("o.created_at >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("o.created_at <= ?");
    params.push(opts.dateTo + " 23:59:59");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

export async function getAdminOrders(
  opts: AdminOrderFilters = {}
): Promise<AdminOrder[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const { where, params } = buildFilterClause(opts);

  let orderBy = "o.created_at DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "o.created_at ASC";
      break;
    case "total_asc":
      orderBy = "o.total ASC";
      break;
    case "total_desc":
      orderBy = "o.total DESC";
      break;
  }

  return query<AdminOrder>(
    `SELECT o.*,
       (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
       u.email as user_email,
       u.name as user_name,
       u.phone as user_phone
     FROM orders o
     LEFT JOIN user u ON u.id = o.user_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function getAdminOrderCount(
  opts: AdminOrderFilters = {}
): Promise<number> {
  const { where, params } = buildFilterClause(opts);

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders o
     LEFT JOIN user u ON u.id = o.user_id
     ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getAdminOrderById(
  id: string
): Promise<AdminOrderDetail | null> {
  const order = await queryFirst<
    Order & { user_email: string; user_name: string; user_phone: string | null }
  >(
    `SELECT o.*,
       u.email as user_email,
       u.name as user_name,
       u.phone as user_phone
     FROM orders o
     LEFT JOIN user u ON u.id = o.user_id
     WHERE o.id = ?`,
    [id]
  );

  if (!order) return null;

  const [items, status_history] = await Promise.all([
    query<OrderItem>("SELECT * FROM order_items WHERE order_id = ?", [id]),
    query<OrderStatusHistory>(
      "SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC",
      [id]
    ),
  ]);

  return { ...order, items, status_history };
}

export async function getOrderStatusHistory(
  orderId: string
): Promise<OrderStatusHistory[]> {
  return query<OrderStatusHistory>(
    "SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC",
    [orderId]
  );
}

export async function getDistinctCommunes(): Promise<string[]> {
  const rows = await query<{ commune: string }>(
    "SELECT DISTINCT delivery_commune as commune FROM orders ORDER BY commune ASC"
  );
  return rows.map((r) => r.commune);
}

export async function getDeliveryPersons(): Promise<
  { id: string; name: string }[]
> {
  return query<{ id: string; name: string }>(
    `SELECT id, name
     FROM user
     WHERE role IN ('admin', 'super_admin')
     ORDER BY name ASC`
  );
}
