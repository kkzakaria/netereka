import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));

import { createRevision, sanitizePayload, scopeFor, RevisionError, applyRevision, rejectRevision } from "@/lib/db/revisions";

beforeEach(() => {
  d1.current = createD1Mock();
});

const isRevisionInsert = (s: BoundStatement) => /insert into "content_revisions"/i.test(s.sql);
const isAuditInsert = (s: BoundStatement) => /insert into "audit_log"/i.test(s.sql);

const STYLED_HTML = "<style>.a { color: red; }</style><div class=\"a\">Libre</div>";

// ─── Helpers partagés par applyRevision / rejectRevision ───

/** Une ligne `content_revisions`, positionnelle, dans l'ordre du schéma (voir getRevision). */
function revisionRow(overrides: Record<string, unknown> = {}): unknown[] {
  const defaults: Record<string, unknown> = {
    id: "rev-1",
    target_type: "product",
    target_id: "p1",
    kind: "update",
    payload: JSON.stringify({ name: "Nouveau nom" }),
    origin: "mcp",
    actor_id: "mcp-1",
    actor_name: "Assistant MCP",
    summary: null,
    status: "pending",
    base_version: "2026-01-01 00:00:00",
    created_at: "2026-01-01 00:00:00",
    resolved_at: null,
    resolved_by: null,
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.id, merged.target_type, merged.target_id, merged.kind, merged.payload,
    merged.origin, merged.actor_id, merged.actor_name, merged.summary, merged.status,
    merged.base_version, merged.created_at, merged.resolved_at, merged.resolved_by,
  ];
}

const isGetRevisionSelect = (sql: string) => /^select "id", "target_type"/.test(sql);
const isProductVersionSelect = (sql: string) => /^select "updated_at" from "products"/.test(sql);
const isBannerVersionSelect = (sql: string) => /^select "updated_at" from "banners"/.test(sql);
const isOthersSelect = (sql: string) => /^select "id" from "content_revisions"/.test(sql);

/** Câble les trois lectures d'applyRevision : la révision, la version de la cible, les autres pending. */
function mockApplyReads(opts: { rev: unknown[] | null; targetVersion: string | null; others?: string[] }) {
  d1.current!.raw.mockImplementation(async (stmt) => {
    if (isGetRevisionSelect(stmt.sql)) return opts.rev ? [opts.rev] : [];
    if (isProductVersionSelect(stmt.sql) || isBannerVersionSelect(stmt.sql)) {
      return opts.targetVersion === null ? [] : [[opts.targetVersion]];
    }
    if (isOthersSelect(stmt.sql)) return (opts.others ?? []).map((id) => [id]);
    return [];
  });
}

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

describe("applyRevision", () => {
  const ADMIN = { id: "admin-9", name: "Admin Neuf" };

  it("lève not_found si la révision n'existe pas, et n'écrit rien", async () => {
    mockApplyReads({ rev: null, targetVersion: null });
    await expect(applyRevision("missing", ADMIN)).rejects.toMatchObject({ code: "not_found" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("lève conflict si la révision est déjà applied, et n'écrit rien", async () => {
    mockApplyReads({ rev: revisionRow({ status: "applied" }), targetVersion: "2026-01-01 00:00:00" });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("lève not_found si la cible a disparu depuis le dépôt", async () => {
    mockApplyReads({ rev: revisionRow(), targetVersion: null });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "not_found" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("lève conflict si la cible a changé depuis le dépôt, avec un message qui dit quoi faire, et n'écrit rien", async () => {
    mockApplyReads({
      rev: revisionRow({ base_version: "2026-01-01 00:00:00" }),
      targetVersion: "2026-01-02 00:00:00", // updated_at actuel ≠ base_version : conflit
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toThrow(/proposition fraîche/);
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("applique une révision update : écrit les colonnes, marque applied, journalise, en un seul batch", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      others: [],
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });
    expect(d1.current!.batch).toHaveBeenCalledTimes(1);

    const stmts = d1.current!.batchStatements();
    expect(stmts).toHaveLength(4);

    const targetUpdate = stmts.find((s) => /^update "products"/i.test(s.sql))!;
    expect(targetUpdate).toBeDefined();
    expect(targetUpdate.sql).toMatch(/"name" = \?/);
    expect(targetUpdate.sql).toMatch(/"updated_at" = datetime\('now'\)/);
    expect(targetUpdate.params).toEqual(expect.arrayContaining(["Nouveau nom", "p1"]));
    expect(targetUpdate.sql).not.toMatch(/"is_draft"/); // kind update : is_draft non touché

    const appliedUpdate = stmts.find((s) => s.params.includes("applied"))!;
    expect(appliedUpdate).toBeDefined();
    expect(appliedUpdate.params).toEqual(expect.arrayContaining(["applied", ADMIN.id, "rev-1"]));

    const supersedeUpdate = stmts.find((s) => s.params.includes("superseded"))!;
    expect(supersedeUpdate).toBeDefined();
    expect(supersedeUpdate.params).toEqual(["superseded", ADMIN.id, "product", "p1", "pending", "rev-1"]);

    const auditInsert = stmts.find(isAuditInsert)!;
    expect(auditInsert.params).toEqual(expect.arrayContaining([ADMIN.id, ADMIN.name, "revision.applied", "product", "p1"]));
  });

  it("kind publish met is_draft = 0 sur le produit cible", async () => {
    mockApplyReads({
      rev: revisionRow({ kind: "publish", payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await applyRevision("rev-1", ADMIN);
    const targetUpdate = d1.current!.batchStatements().find((s) => /^update "products"/i.test(s.sql))!;
    expect(targetUpdate.sql).toMatch(/"is_draft" = \?/);
    expect(targetUpdate.params).toEqual(expect.arrayContaining([0]));
  });

  it("applique une révision de bannière sur la table banners, avec l'id numérique", async () => {
    mockApplyReads({
      rev: revisionRow({ target_type: "banner", target_id: "42", payload: JSON.stringify({ content_html: "<p>Hi</p>" }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await applyRevision("rev-1", ADMIN);
    const targetUpdate = d1.current!.batchStatements().find((s) => /^update "banners"/i.test(s.sql))!;
    expect(targetUpdate).toBeDefined();
    expect(targetUpdate.params).toEqual(expect.arrayContaining(["<p>Hi</p>", 42]));
  });

  it("compte les autres révisions pending de la même cible passées en superseded", async () => {
    mockApplyReads({ rev: revisionRow(), targetVersion: "2026-01-01 00:00:00", others: ["rev-2", "rev-3"] });
    const result = await applyRevision("rev-1", ADMIN);
    expect(result.superseded).toBe(2);
  });

  // Preuve de discrimination (portée du supersede) : la clause WHERE de
  // l'UPDATE de supersede ne référence QUE le couple (target_type, target_id)
  // de la révision appliquée. Un test qui se contenterait de vérifier
  // "des révisions sont passées en superseded" passerait même si la requête
  // avait été écrite sans filtrage de cible (toute la table `pending`) — celui-ci
  // vérifie explicitement la présence et les valeurs de ce filtrage, pour
  // qu'une régression sur la portée le fasse rougir. Voir le rapport de tâche
  // pour la preuve : ce test rougit quand `target_type`/`target_id` sont
  // retirés de la clause.
  it("preuve de portée : le supersede ne référence que la cible de la révision appliquée, jamais une autre", async () => {
    mockApplyReads({ rev: revisionRow(), targetVersion: "2026-01-01 00:00:00", others: ["rev-2"] });
    await applyRevision("rev-1", ADMIN);

    const supersedeUpdate = d1.current!.batchStatements().find((s) => s.params.includes("superseded"))!;
    expect(supersedeUpdate.sql).toMatch(/"content_revisions"\."target_type" = \? and "content_revisions"\."target_id" = \?/);
    // Les seules valeurs de cible liées sont celles de la révision appliquée
    // ("product", "p1") — aucune autre cible ne peut donc jamais matcher.
    expect(supersedeUpdate.params).toEqual(["superseded", ADMIN.id, "product", "p1", "pending", "rev-1"]);
  });
});

describe("rejectRevision", () => {
  const ADMIN = { id: "admin-9", name: "Admin Neuf" };

  it("lève not_found si la révision n'existe pas", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (isGetRevisionSelect(stmt.sql) ? [] : []));
    await expect(rejectRevision("missing", ADMIN)).rejects.toMatchObject({ code: "not_found" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("lève conflict si la révision n'est plus pending", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      (isGetRevisionSelect(stmt.sql) ? [revisionRow({ status: "rejected" })] : []));
    await expect(rejectRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette sans jamais toucher la cible : aucune écriture sur products ni banners", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (isGetRevisionSelect(stmt.sql) ? [revisionRow()] : []));

    const result = await rejectRevision("rev-1", ADMIN);
    expect(result).toEqual({ rejected: true });

    const stmts = d1.current!.batchStatements();
    expect(stmts).toHaveLength(2);
    expect(stmts.some((s) => /"products"/i.test(s.sql))).toBe(false);
    expect(stmts.some((s) => /"banners"/i.test(s.sql))).toBe(false);

    const revisionUpdate = stmts.find((s) => /^update "content_revisions"/i.test(s.sql))!;
    expect(revisionUpdate.params).toEqual(expect.arrayContaining(["rejected", ADMIN.id, "rev-1"]));

    const auditInsert = stmts.find(isAuditInsert)!;
    expect(auditInsert.params).toEqual(expect.arrayContaining([ADMIN.id, ADMIN.name, "revision.rejected", "product", "p1"]));
  });
});
