import { execute, query, queryFirst } from "@/lib/db";
import type { AuditAction, AuditLog } from "@/lib/db/types";

export async function createAuditLog(entry: {
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details?: string;
}): Promise<void> {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO audit_log (id, actor_id, actor_name, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.actorId,
      entry.actorName,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.details ?? null,
    ]
  );
}

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(
  opts: AuditLogFilters = {}
): Promise<AuditLog[]> {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.action) {
    conditions.push("a.action = ?");
    params.push(opts.action);
  }

  if (opts.actorId) {
    conditions.push("a.actor_id = ?");
    params.push(opts.actorId);
  }

  if (opts.targetType) {
    conditions.push("a.target_type = ?");
    params.push(opts.targetType);
  }

  if (opts.targetId) {
    conditions.push("a.target_id = ?");
    params.push(opts.targetId);
  }

  if (opts.dateFrom) {
    conditions.push("a.created_at >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("a.created_at <= ?");
    params.push(opts.dateTo + " 23:59:59");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<AuditLog>(
    `SELECT a.id, a.actor_id, a.actor_name, a.action, a.target_type, a.target_id, a.details, a.created_at
     FROM audit_log a
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function getAuditLogCount(
  opts: AuditLogFilters = {}
): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.action) {
    conditions.push("a.action = ?");
    params.push(opts.action);
  }

  if (opts.actorId) {
    conditions.push("a.actor_id = ?");
    params.push(opts.actorId);
  }

  if (opts.targetType) {
    conditions.push("a.target_type = ?");
    params.push(opts.targetType);
  }

  if (opts.targetId) {
    conditions.push("a.target_id = ?");
    params.push(opts.targetId);
  }

  if (opts.dateFrom) {
    conditions.push("a.created_at >= ?");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("a.created_at <= ?");
    params.push(opts.dateTo + " 23:59:59");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM audit_log a ${where}`,
    params
  );
  return result?.count ?? 0;
}
