import { execute, query, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import type { AuditAction, AuditLog } from "@/lib/db/types";

export interface AuditLogEntry {
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details?: string;
}

/**
 * Returns a prepared D1 statement for inserting an audit log entry.
 * Use with `batch()` to group with other operations in a transaction.
 */
export async function prepareAuditLog(
  entry: AuditLogEntry
): Promise<D1PreparedStatement> {
  const db = await getDB();
  const id = crypto.randomUUID();
  return db
    .prepare(
      `INSERT INTO audit_log (id, actor_id, actor_name, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      entry.actorId,
      entry.actorName,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.details ?? null
    );
}

/**
 * Creates an audit log entry. For transactional use, prefer `prepareAuditLog()` with `batch()`.
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
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

function buildAuditWhereClause(
  opts: AuditLogFilters
): { where: string; params: unknown[] } {
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
    conditions.push("a.created_at >= datetime(?)");
    params.push(opts.dateFrom);
  }

  if (opts.dateTo) {
    conditions.push("a.created_at < datetime(?, '+1 day')");
    params.push(opts.dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { where, params };
}

export async function getAuditLogs(
  opts: AuditLogFilters = {}
): Promise<AuditLog[]> {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const { where, params } = buildAuditWhereClause(opts);

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
  const { where, params } = buildAuditWhereClause(opts);

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM audit_log a ${where}`,
    params
  );
  return result?.count ?? 0;
}
