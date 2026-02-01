import { getDB } from "@/lib/cloudflare/context";

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDB();
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results;
}

export async function queryFirst<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const db = await getDB();
  const result = await db.prepare(sql).bind(...params).first<T>();
  return result ?? null;
}

export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<D1Result> {
  const db = await getDB();
  return db.prepare(sql).bind(...params).run();
}

export async function batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
  const db = await getDB();
  return db.batch(statements);
}
