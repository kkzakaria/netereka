import { query, queryFirst } from "@/lib/db";
import type { TeamMember, TeamMemberDetail } from "@/lib/db/types";

export interface TeamFilters {
  search?: string;
  role?: "admin" | "super_admin" | "all";
  isActive?: boolean;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  limit?: number;
  offset?: number;
}

function buildFilterClause(opts: TeamFilters): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push(
      "((tm.first_name || ' ' || tm.last_name) LIKE ? OR u.email LIKE ? OR tm.phone LIKE ?)"
    );
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }

  // Filter to team members only (admin and super_admin)
  conditions.push("u.role IN ('admin', 'super_admin')");

  if (opts.role && opts.role !== "all") {
    conditions.push("u.role = ?");
    params.push(opts.role);
  }

  if (opts.isActive !== undefined) {
    conditions.push("tm.is_active = ?");
    params.push(opts.isActive ? 1 : 0);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

export async function getTeamMembers(
  opts: TeamFilters = {}
): Promise<TeamMember[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const { where, params } = buildFilterClause(opts);

  let orderBy = "tm.created_at DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "tm.created_at ASC";
      break;
    case "name_asc":
      orderBy = "(tm.first_name || ' ' || tm.last_name) ASC";
      break;
    case "name_desc":
      orderBy = "(tm.first_name || ' ' || tm.last_name) DESC";
      break;
  }

  return query<TeamMember>(
    `SELECT
       tm.id,
       tm.user_id,
       tm.first_name,
       tm.last_name,
       u.email,
       tm.phone,
       tm.avatar_url,
       u.role,
       tm.job_title,
       tm.permissions,
       tm.is_active,
       tm.last_login_at,
       tm.created_at,
       tm.updated_at
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function getTeamMemberCount(
  opts: TeamFilters = {}
): Promise<number> {
  const { where, params } = buildFilterClause(opts);

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getTeamMemberById(
  id: string
): Promise<TeamMemberDetail | null> {
  const member = await queryFirst<TeamMember>(
    `SELECT
       tm.id,
       tm.user_id,
       tm.first_name,
       tm.last_name,
       u.email,
       tm.phone,
       tm.avatar_url,
       u.role,
       tm.job_title,
       tm.permissions,
       tm.is_active,
       tm.last_login_at,
       tm.created_at,
       tm.updated_at
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [id]
  );

  if (!member) return null;

  // Get stats - orders handled (confirmed, status changes made by this user)
  const stats = await queryFirst<{
    orders_handled: number;
    last_activity: string | null;
  }>(
    `SELECT
       COUNT(DISTINCT osh.order_id) as orders_handled,
       MAX(osh.created_at) as last_activity
     FROM order_status_history osh
     WHERE osh.changed_by = ?`,
    [member.user_id]
  );

  return {
    ...member,
    orders_handled: stats?.orders_handled ?? 0,
    last_activity: stats?.last_activity ?? null,
  };
}

export async function getTeamMemberByUserId(
  userId: string
): Promise<TeamMember | null> {
  return queryFirst<TeamMember>(
    `SELECT
       tm.id,
       tm.user_id,
       tm.first_name,
       tm.last_name,
       u.email,
       tm.phone,
       tm.avatar_url,
       u.role,
       tm.job_title,
       tm.permissions,
       tm.is_active,
       tm.last_login_at,
       tm.created_at,
       tm.updated_at
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.user_id = ?`,
    [userId]
  );
}
