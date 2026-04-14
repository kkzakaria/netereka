import { describe, it, expect } from "vitest";
import { analyze, PATTERNS } from "../../scripts/check-migration-safety.mjs";

describe("check-migration-safety — analyze()", () => {
  it("passes a safe ADD COLUMN migration", () => {
    const sql = `ALTER TABLE products ADD COLUMN description TEXT;`;
    const { violations, bypass } = analyze(sql);
    expect(violations).toEqual([]);
    expect(bypass).toBeNull();
  });

  it("blocks DROP COLUMN", () => {
    const sql = `ALTER TABLE products DROP COLUMN description;`;
    const { violations } = analyze(sql);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternId).toBe("drop-column");
    expect(violations[0].level).toBe("error");
  });

  it("blocks DROP TABLE", () => {
    const sql = `DROP TABLE obsolete_table;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("drop-table");
  });

  it("blocks RENAME COLUMN", () => {
    const sql = `ALTER TABLE users RENAME COLUMN old_name TO new_name;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("rename-column");
  });

  it("blocks ALTER COLUMN NOT NULL without DEFAULT", () => {
    const sql = `ALTER TABLE products ALTER COLUMN price SET NOT NULL;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain(
      "alter-not-null-no-default"
    );
  });

  it("allows ALTER COLUMN NOT NULL with DEFAULT on same statement", () => {
    const sql = `ALTER TABLE products ALTER COLUMN price SET NOT NULL DEFAULT 0;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).not.toContain(
      "alter-not-null-no-default"
    );
  });

  it("blocks DROP INDEX on an index whose name contains 'unique' (Drizzle convention)", () => {
    // Drizzle generates names like `categories_slug_unique` for unique indexes.
    // SQLite's DROP INDEX syntax doesn't include a UNIQUE keyword, so we match on name.
    const sql = `DROP INDEX categories_slug_unique;`;
    const { violations } = analyze(sql);
    const hit = violations.find(
      (v: { patternId: string }) => v.patternId === "drop-unique-index"
    );
    expect(hit).toBeDefined();
    expect(hit!.level).toBe("error");
  });

  it("flags plain (non-unique) DROP INDEX as warning only", () => {
    const sql = `DROP INDEX idx_products_created_at;`;
    const { violations } = analyze(sql);
    const errors = violations.filter(
      (v: { level: string }) => v.level === "error"
    );
    const warnings = violations.filter(
      (v: { level: string }) => v.level === "warning"
    );
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("honors the bypass marker and clears violations", () => {
    const sql = `-- migration-safety: acknowledged reason="dropped after PR #42 stopped using"
ALTER TABLE products DROP COLUMN old_field;`;
    const { violations, bypass } = analyze(sql);
    expect(violations).toEqual([]);
    expect(bypass).toBe("dropped after PR #42 stopped using");
  });

  it("is case-insensitive on SQL keywords", () => {
    const sql = `alter table products drop column foo;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("drop-column");
  });

  it("ignores dangerous keywords inside SQL line comments", () => {
    // A narrative comment must not trigger a false positive.
    const sql = `-- TODO: follow-up PR will DROP TABLE legacy_items
ALTER TABLE products ADD COLUMN notes TEXT;`;
    const { violations } = analyze(sql);
    expect(violations).toEqual([]);
  });

  it("ignores dangerous keywords inside SQL block comments", () => {
    const sql = `/* Historical note: we used to DROP COLUMN price
   before we adopted expand/contract. */
ALTER TABLE products ADD COLUMN notes TEXT;`;
    const { violations } = analyze(sql);
    expect(violations).toEqual([]);
  });

  it("still catches the real statement when a harmless comment appears alongside", () => {
    const sql = `-- This migration drops the old column after PR #42
ALTER TABLE products DROP COLUMN old_field;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("drop-column");
  });

  it("exports the expected pattern IDs", () => {
    const ids = PATTERNS.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual(
      [
        "alter-not-null-no-default",
        "drop-column",
        "drop-index",
        "drop-table",
        "drop-unique-index",
        "rename-column",
      ].sort()
    );
  });
});
