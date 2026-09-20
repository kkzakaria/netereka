import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));

import { createRevision, sanitizePayload, scopeFor, RevisionError } from "@/lib/db/revisions";

beforeEach(() => {
  d1.current = createD1Mock();
});

const isRevisionInsert = (s: BoundStatement) => /insert into "content_revisions"/i.test(s.sql);
const isAuditInsert = (s: BoundStatement) => /insert into "audit_log"/i.test(s.sql);

const STYLED_HTML = "<style>.a { color: red; }</style><div class=\"a\">Libre</div>";

describe("scopeFor", () => {
  it("un produit se scope sur son id nu", () => {
    expect(scopeFor("product", "p1")).toBe("p1");
  });

  it("une bannière se scope sur banner-<id>", () => {
    expect(scopeFor("banner", "42")).toBe("banner-42");
  });
});

describe("sanitizePayload", () => {
  it("assainit description et faq_html d'un produit avec la portée de l'id nu", () => {
    const out = sanitizePayload("product", "p1", {
      description: STYLED_HTML,
      faq_html: STYLED_HTML,
    });
    // Portée attendue : `.desc-p1`, pas `.desc-banner-p1` ni une portée fixe.
    expect(out.description).toContain(".desc-p1 .a");
    expect(out.faq_html).toContain(".desc-p1 .a");
  });

  it("assainit content_html d'une bannière avec la portée banner-<id>", () => {
    const out = sanitizePayload("banner", "42", { content_html: STYLED_HTML });
    expect(out.content_html).toContain(".desc-banner-42 .a");
  });

  it("ne touche pas à une colonne non-HTML (base_price)", () => {
    const out = sanitizePayload("product", "p1", { base_price: 150000 });
    expect(out.base_price).toBe(150000);
  });

  it("laisse une valeur absente absente, sans produire de chaîne vide", () => {
    const out = sanitizePayload("product", "p1", { short_description: "Résumé" });
    expect("description" in out).toBe(false);
    expect(out.description).toBeUndefined();
  });

  it("laisse une chaîne vide vide, sans la faire passer par l'assainissement", () => {
    const out = sanitizePayload("product", "p1", { description: "" });
    expect(out.description).toBe("");
  });

  it("retire le <script> injecté tout en assainissant", () => {
    const out = sanitizePayload("product", "p1", {
      description: "<div>Libre</div><script>alert(1)</script>",
    });
    expect(out.description).not.toContain("<script>");
  });
});

describe("createRevision", () => {
  const ACTOR = { id: "admin-1", name: "Admin" };

  it("lève not_found sur une cible produit inexistante", async () => {
    d1.current!.raw.mockResolvedValue([]);
    await expect(
      createRevision({
        target: "product",
        targetId: "missing",
        kind: "update",
        payload: { description: "<p>Hi</p>" },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toBeInstanceOf(RevisionError);
    await expect(
      createRevision({
        target: "product",
        targetId: "missing",
        kind: "update",
        payload: { description: "<p>Hi</p>" },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("lève not_found sur une cible bannière inexistante", async () => {
    d1.current!.raw.mockResolvedValue([]);
    await expect(
      createRevision({
        target: "banner",
        targetId: "42",
        kind: "update",
        payload: { content_html: "<p>Hi</p>" },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("écrit la révision et l'audit dans le même batch, avec la portée correcte du produit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);

    const r = await createRevision({
      target: "product",
      targetId: "p1",
      kind: "update",
      payload: { description: STYLED_HTML },
      origin: "mcp",
      actor: ACTOR,
      summary: "Nouvelle description",
    });

    expect(r.status).toBe("pending");
    expect(d1.current!.batch).toHaveBeenCalledTimes(1);
    const stmts = d1.current!.batchStatements();
    expect(stmts).toHaveLength(2);

    const revisionInsert = stmts.find(isRevisionInsert)!;
    expect(revisionInsert).toBeDefined();
    const strings = revisionInsert.params.filter((p): p is string => typeof p === "string");
    expect(strings.some((s) => s.includes(".desc-p1 .a"))).toBe(true);
    expect(strings).toContain("p1");
    expect(strings).toContain("product");
    expect(strings).toContain("pending");

    const auditInsert = stmts.find(isAuditInsert)!;
    expect(auditInsert).toBeDefined();
    expect(auditInsert.params).toEqual(expect.arrayContaining([
      "admin-1", "Admin", "revision.created.update", "product", "p1",
    ]));
  });

  it("écrit la révision d'une bannière avec la portée banner-<id>, pas l'id nu", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "banners"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);

    await createRevision({
      target: "banner",
      targetId: "42",
      kind: "update",
      payload: { content_html: STYLED_HTML },
      origin: "mcp",
      actor: ACTOR,
    });

    const stmts = d1.current!.batchStatements();
    const revisionInsert = stmts.find(isRevisionInsert)!;
    const strings = revisionInsert.params.filter((p): p is string => typeof p === "string");
    // Preuve de discrimination : ce test doit rougir si la portée régresse
    // vers l'id nu ("42") au lieu de "banner-42".
    expect(strings.some((s) => s.includes(".desc-banner-42 .a"))).toBe(true);
    expect(strings.some((s) => s.includes(".desc-42 .a"))).toBe(false);
  });
});
