import { query, queryFirst } from "@/lib/db";
import type { AdminCustomer } from "@/lib/db/types";

export type AdminUser = Omit<AdminCustomer, "order_count" | "total_spent">;

export interface AdminUserFilters {
  search?: string;
  role?: "admin" | "super_admin";
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  limit?: number;
  offset?: number;
}

function buildFilterClause(opts: AdminUserFilters): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = ["u.role IN ('admin', 'super_admin')"];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push(
      "(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
    );
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }

  if (opts.role) {
    conditions.push("u.role = ?");
    params.push(opts.role);
  }

  if (opts.dateFrom) {
    conditions.push("u.createdAt >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("u.createdAt <= ?");
    params.push(opts.dateTo + " 23:59:59");
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  return { where, params };
}

export async function getAdminUsers(
  opts: AdminUserFilters = {}
): Promise<AdminUser[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const { where, params } = buildFilterClause(opts);

  let orderBy = "u.createdAt DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "u.createdAt ASC";
      break;
    case "name_asc":
      orderBy = "u.name ASC";
      break;
    case "name_desc":
      orderBy = "u.name DESC";
      break;
  }

  return query<AdminUser>(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.phone,
       u.role,
       u.emailVerified,
       u.image,
       1 as is_active, -- TODO: hardcoded until is_active column exists
       u.createdAt
     FROM user u
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function getAdminUserCount(
  opts: AdminUserFilters = {}
): Promise<number> {
  const { where, params } = buildFilterClause(opts);

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM user u ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getAdminUserById(
  id: string
): Promise<AdminUser | null> {
  return queryFirst<AdminUser>(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.phone,
       u.role,
       u.emailVerified,
       u.image,
       1 as is_active, -- TODO: hardcoded until is_active column exists
       u.createdAt
     FROM user u
     WHERE u.id = ? AND u.role IN ('admin', 'super_admin')`,
    [id]
  );
}
