import { query, queryFirst } from "@/lib/db";
import type {
  Address,
  AdminOrder,
  AdminCustomer,
  AdminCustomerDetail,
} from "@/lib/db/types";

export interface AdminCustomerFilters {
  search?: string;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "spent_desc";
  limit?: number;
  offset?: number;
}

function buildFilterClause(opts: AdminCustomerFilters): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push(
      "((c.first_name || ' ' || c.last_name) LIKE ? OR u.email LIKE ? OR c.phone LIKE ?)"
    );
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }

  if (opts.isActive !== undefined) {
    conditions.push("c.is_active = ?");
    params.push(opts.isActive ? 1 : 0);
  }

  if (opts.dateFrom) {
    conditions.push("c.created_at >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("c.created_at <= ?");
    params.push(opts.dateTo + " 23:59:59");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

export async function getAdminCustomers(
  opts: AdminCustomerFilters = {}
): Promise<AdminCustomer[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const { where, params } = buildFilterClause(opts);

  let orderBy = "c.created_at DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "c.created_at ASC";
      break;
    case "name_asc":
      orderBy = "name ASC";
      break;
    case "name_desc":
      orderBy = "name DESC";
      break;
    case "spent_desc":
      orderBy = "total_spent DESC";
      break;
  }

  return query<AdminCustomer>(
    `SELECT
       c.id,
       (c.first_name || ' ' || c.last_name) as name,
       u.email,
       c.phone,
       u.role,
       u.emailVerified as emailVerified,
       c.avatar_url as image,
       c.is_active,
       c.created_at as createdAt,
       COALESCE(stats.order_count, 0) as order_count,
       COALESCE(stats.total_spent, 0) as total_spent
     FROM customers c
     JOIN "user" u ON u.id = c.user_id
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) as order_count,
         SUM(total) as total_spent
       FROM orders
       WHERE status NOT IN ('cancelled', 'returned')
       GROUP BY user_id
     ) stats ON stats.user_id = c.user_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function getAdminCustomerCount(
  opts: AdminCustomerFilters = {}
): Promise<number> {
  const { where, params } = buildFilterClause(opts);

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM customers c
     JOIN "user" u ON u.id = c.user_id
     ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getAdminCustomerById(
  id: string
): Promise<AdminCustomerDetail | null> {
  const customer = await queryFirst<AdminCustomer>(
    `SELECT
       c.id,
       (c.first_name || ' ' || c.last_name) as name,
       u.email,
       c.phone,
       u.role,
       u.emailVerified as emailVerified,
       c.avatar_url as image,
       c.is_active,
       c.created_at as createdAt,
       COALESCE(stats.order_count, 0) as order_count,
       COALESCE(stats.total_spent, 0) as total_spent
     FROM customers c
     JOIN "user" u ON u.id = c.user_id
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) as order_count,
         SUM(total) as total_spent
       FROM orders
       WHERE status NOT IN ('cancelled', 'returned')
       GROUP BY user_id
     ) stats ON stats.user_id = c.user_id
     WHERE c.id = ?`,
    [id]
  );

  if (!customer) return null;

  // Get customer's user_id for related queries
  const customerData = await queryFirst<{ user_id: string }>(
    "SELECT user_id FROM customers WHERE id = ?",
    [id]
  );

  if (!customerData) return null;

  const [addresses, recent_orders] = await Promise.all([
    query<Address>(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [customerData.user_id]
    ),
    query<AdminOrder>(
      `SELECT o.*,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
         u.email as user_email,
         (c.first_name || ' ' || c.last_name) as user_name,
         c.phone as user_phone
       FROM orders o
       JOIN customers c ON c.user_id = o.user_id
       JOIN "user" u ON u.id = o.user_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [customerData.user_id]
    ),
  ]);

  return { ...customer, addresses, recent_orders };
}
