import { query, queryFirst } from "@/lib/db";
import type {
  Address,
  AdminOrder,
  AdminCustomer,
  AdminCustomerDetail,
  UserRole,
} from "@/lib/db/types";

export interface AdminCustomerFilters {
  search?: string;
  role?: string;
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
      "((u.first_name || ' ' || u.last_name) LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
    );
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }

  if (opts.role && opts.role !== "all") {
    conditions.push("u.role = ?");
    params.push(opts.role);
  }

  if (opts.dateFrom) {
    conditions.push("u.created_at >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("u.created_at <= ?");
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

  let orderBy = "u.created_at DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "u.created_at ASC";
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
       u.id,
       (u.first_name || ' ' || u.last_name) as name,
       u.email,
       u.phone,
       u.role,
       u.is_verified as emailVerified,
       u.avatar_url as image,
       COALESCE(u.is_active, 1) as is_active,
       u.created_at as createdAt,
       COALESCE(stats.order_count, 0) as order_count,
       COALESCE(stats.total_spent, 0) as total_spent
     FROM users u
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) as order_count,
         SUM(total) as total_spent
       FROM orders
       WHERE status NOT IN ('cancelled', 'returned')
       GROUP BY user_id
     ) stats ON stats.user_id = u.id
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
    `SELECT COUNT(*) as count FROM users u ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getAdminCustomerById(
  id: string
): Promise<AdminCustomerDetail | null> {
  const customer = await queryFirst<AdminCustomer>(
    `SELECT
       u.id,
       (u.first_name || ' ' || u.last_name) as name,
       u.email,
       u.phone,
       u.role,
       u.is_verified as emailVerified,
       u.avatar_url as image,
       COALESCE(u.is_active, 1) as is_active,
       u.created_at as createdAt,
       COALESCE(stats.order_count, 0) as order_count,
       COALESCE(stats.total_spent, 0) as total_spent
     FROM users u
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) as order_count,
         SUM(total) as total_spent
       FROM orders
       WHERE status NOT IN ('cancelled', 'returned')
       GROUP BY user_id
     ) stats ON stats.user_id = u.id
     WHERE u.id = ?`,
    [id]
  );

  if (!customer) return null;

  const [addresses, recent_orders] = await Promise.all([
    query<Address>("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC", [id]),
    query<AdminOrder>(
      `SELECT o.*,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
         u.email as user_email,
         (u.first_name || ' ' || u.last_name) as user_name,
         u.phone as user_phone
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [id]
    ),
  ]);

  return { ...customer, addresses, recent_orders };
}

export async function getDistinctRoles(): Promise<UserRole[]> {
  const rows = await query<{ role: UserRole }>(
    "SELECT DISTINCT role FROM users ORDER BY role ASC"
  );
  return rows.map((r) => r.role);
}
