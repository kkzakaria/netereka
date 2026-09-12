import { vi } from "vitest";

/**
 * Mocks the D1 binding one level below Drizzle so the real driver compiles the
 * statements. Assertions run against the SQL/params Drizzle emits, which is
 * what catches schema/column drift. Same technique as products-ai.test.ts.
 *
 * `raw` feeds `.get()`/`.all()` with POSITIONAL row arrays in select order
 * (Drizzle's D1 driver reads `stmt.raw()` when a field selection exists).
 * Return `[]` for "no row".
 *
 * Usage:
 *   const d1 = createD1Mock();
 *   vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.binding }));
 */
export interface BoundStatement { sql: string; params: unknown[] }

export function createD1Mock() {
  const bound = vi.fn<(stmt: BoundStatement) => void>();
  const run = vi.fn<(stmt: BoundStatement) => Promise<unknown>>();
  const raw = vi.fn<(stmt: BoundStatement) => Promise<unknown[][]>>();
  const batch = vi.fn<(stmts: BoundStatement[]) => Promise<unknown[]>>();

  const binding = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const stmt = { sql, params };
        bound(stmt);
        return {
          ...stmt,
          run: () => run(stmt),
          all: () => raw(stmt).then((rows) => ({ results: rows })),
          raw: () => raw(stmt),
        };
      },
    }),
    batch: (stmts: BoundStatement[]) => batch(stmts),
  };

  function reset() {
    bound.mockReset();
    run.mockReset().mockResolvedValue({ success: true, meta: { changes: 1 }, results: [] });
    raw.mockReset().mockResolvedValue([]);
    batch.mockReset().mockResolvedValue([]);
  }
  reset();

  /** Statements handed to the Nth `db.batch()` call. */
  const batchStatements = (call = 0) => batch.mock.calls[call][0];
  const boundMatching = (re: RegExp) => bound.mock.calls.map((c) => c[0]).filter((s) => re.test(s.sql));

  return { binding, bound, run, raw, batch, reset, batchStatements, boundMatching };
}
