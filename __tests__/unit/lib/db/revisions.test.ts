import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});
const storageMocks = vi.hoisted(() => ({ deleteFromR2: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
// `deleteFromR2` mocké : le nettoyage R2 (rejet d'une révision `add_images`,
// suppression appliquée d'une révision `remove_image`) ne doit jamais
// atteindre un vrai bucket dans ce fichier de test.
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: storageMocks.deleteFromR2, uploadToR2: vi.fn() }));

import {
  createRevision,
  sanitizePayload,
  scopeFor,
  resolveVariantPrice,
  REVISION_KIND_LABELS,
  RevisionError,
  applyRevision,
  rejectRevision,
} from "@/lib/db/revisions";

beforeEach(() => {
  d1.current = createD1Mock();
  storageMocks.deleteFromR2.mockClear();
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
// `id`, `kind`, `payload` (B3, revue de phase) : le nettoyage R2 des
// révisions add_images sœurs superseded a besoin de leur nature et de leur
// payload, pas seulement de leur id — voir `applyRevision`.
const isOthersSelect = (sql: string) => /^select "id", "kind", "payload" from "content_revisions"/.test(sql);

/** Une révision voisine (« sœur ») pending sur la même cible, telle que renvoyée
 *  par le SELECT `others` d'applyRevision — un simple id suffit à la plupart
 *  des tests (kind/payload par défaut, sans effet), un objet complet à ceux
 *  qui vérifient le nettoyage R2 d'une sœur add_images superseded. */
type OtherRevision = string | { id: string; kind?: string; payload?: string };

/** Câble les trois lectures d'applyRevision : la révision, la version de la cible, les autres pending. */
function mockApplyReads(opts: { rev: unknown[] | null; targetVersion: string | null; others?: OtherRevision[] }) {
  d1.current!.raw.mockImplementation(async (stmt) => {
    if (isGetRevisionSelect(stmt.sql)) return opts.rev ? [opts.rev] : [];
    if (isProductVersionSelect(stmt.sql) || isBannerVersionSelect(stmt.sql)) {
      return opts.targetVersion === null ? [] : [[opts.targetVersion]];
    }
    if (isOthersSelect(stmt.sql)) {
      return (opts.others ?? []).map((o) =>
        typeof o === "string" ? [o, "update", "{}"] : [o.id, o.kind ?? "update", o.payload ?? "{}"]);
    }
    // Pré-contrôle de plafond d'`add_images` (B2, avant le batch) : par
    // défaut, aucune image déjà présente — les tests qui veulent un compte
    // différent câblent leur propre `raw.mockImplementation`.
    if (/^select count\(\*\) from "product_images"/i.test(stmt.sql)) return [[0]];
    // Relecture post-commit d'`add_images` (B2, après le batch) : par défaut,
    // chaque id interrogé est renvoyé comme atterri (aucune n'a été écartée
    // par la garde de plafond) — sinon ce mock, qui ne simule aucun état réel,
    // ferait croire à un dépassement et nettoierait R2 en silence sur CHAQUE
    // application add_images réussie de ce fichier, pas seulement celle qui
    // veut réellement tester ce cas.
    if (/"product_images"\."id" in/i.test(stmt.sql)) return stmt.params.map((p) => [p]);
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

// Appelée par `buildSetVariantsStatements` (ci-dessous, à l'application) ET
// par l'aperçu affiché sur /revisions (`diffVariants`,
// components/admin/revision-diff.tsx) — une seule fonction, testée ici une
// fois pour ses trois branches, garantit que les deux ne peuvent pas
// produire un prix différent pour la même entrée.
describe("resolveVariantPrice", () => {
  it("garde le prix propre de la variante quand uniform_price est faux et qu'un prix est fourni", () => {
    expect(resolveVariantPrice(9000, false, 12000)).toBe(9000);
  });

  it("impose le prix de base quand uniform_price est vrai, même si un prix propre est fourni", () => {
    expect(resolveVariantPrice(5000, true, 15000)).toBe(15000);
  });

  it("retombe sur le prix de base quand la variante n'a pas de prix propre, même si uniform_price est faux", () => {
    expect(resolveVariantPrice(null, false, 20000)).toBe(20000);
  });
});

// Item 5 (revue de phase) : la liste (/revisions) avait sa propre copie de
// ces libellés, jamais mise à jour pour les trois natures de la
// généralisation des outils — son badge affichait le nom technique brut
// (`add_images`). Une seule constante, importée par la liste ET le détail,
// ferme la classe de bug (une future RevisionKind sans libellé fait échouer
// la compilation, voir le commentaire de REVISION_KIND_LABELS).
describe("REVISION_KIND_LABELS", () => {
  it("porte un libellé pour chacune des sept natures de révision", () => {
    expect(REVISION_KIND_LABELS).toEqual({
      update: "Modification",
      publish: "Publication",
      create: "Création",
      withdraw: "Retrait",
      add_images: "Ajout d'images",
      remove_image: "Suppression d'image",
      set_variants: "Variantes",
    });
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

  // ─── Liste blanche de colonnes (§ WRITABLE_COLUMNS) ───
  //
  // `is_draft` dans un payload `update` dépublierait une fiche en silence —
  // exactement ce que le spec (§ 2.3) interdit d'exposer. `id`/`slug`
  // détacheraient le CSS scopé déjà stocké. Aucun de ces cas n'écrit rien :
  // le rejet arrive avant la lecture de la cible.

  it("rejette is_draft dans le payload d'une révision produit", async () => {
    await expect(
      createRevision({
        target: "product",
        targetId: "p1",
        kind: "update",
        payload: { is_draft: 1 },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
    expect(d1.current!.raw).not.toHaveBeenCalled();
  });

  it("rejette id et slug dans le payload d'une révision produit", async () => {
    await expect(
      createRevision({
        target: "product",
        targetId: "p1",
        kind: "update",
        payload: { id: "p2", slug: "autre-slug" },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette created_at et updated_at dans le payload d'une révision", async () => {
    await expect(
      createRevision({
        target: "product",
        targetId: "p1",
        kind: "update",
        payload: { updated_at: "2020-01-01 00:00:00" },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejette id dans le payload d'une révision bannière", async () => {
    await expect(
      createRevision({
        target: "banner",
        targetId: "42",
        kind: "update",
        payload: { id: 99 },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("accepte un payload composé uniquement de colonnes en liste blanche", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);
    await expect(
      createRevision({
        target: "product",
        targetId: "p1",
        kind: "update",
        payload: { name: "Nouveau nom", base_price: 12000 },
        origin: "mcp",
        actor: ACTOR,
      }),
    ).resolves.toMatchObject({ status: "pending" });
  });

  // ─── Forme du payload des natures add_images / remove_image / set_variants ───

  it("dépose une révision add_images avec la clé R2 telle quelle dans le payload", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);

    const r = await createRevision({
      target: "product",
      targetId: "p1",
      kind: "add_images",
      payload: { images: [{ key: "products/p1/a.jpg", alt: null }] },
      origin: "mcp",
      actor: ACTOR,
    });

    expect(r.status).toBe("pending");
    const revisionInsert = d1.current!.batchStatements().find(isRevisionInsert)!;
    const strings = revisionInsert.params.filter((p): p is string => typeof p === "string");
    expect(strings.some((s) => s.includes("products/p1/a.jpg"))).toBe(true);
  });

  it("rejette add_images sans tableau images, ou avec une image sans clé", async () => {
    await expect(
      createRevision({ target: "product", targetId: "p1", kind: "add_images", payload: {}, origin: "mcp", actor: ACTOR }),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      createRevision({
        target: "product", targetId: "p1", kind: "add_images",
        payload: { images: [{ alt: "sans clé" }] }, origin: "mcp", actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette une entrée de variante hors bornes, même si le tableau est bien formé", async () => {
    // Le schéma Zod du MCP contraint déjà chaque entrée, mais `createRevision`
    // est l'interface que les phases suivantes consomment sans passer par lui.
    // Rougit si la boucle de validation des entrées est retirée.
    const cas: [string, unknown][] = [
      ["nom de couleur vide", { color_name: "  ", color_hex: "#112233", stock: 1, price: null }],
      ["hex invalide", { color_name: "Noir", color_hex: "noir", stock: 1, price: null }],
      ["stock négatif", { color_name: "Noir", color_hex: "#112233", stock: -1, price: null }],
      ["prix fractionnaire", { color_name: "Noir", color_hex: "#112233", stock: 1, price: 9.5 }],
    ];
    for (const [libelle, entree] of cas) {
      d1.current!.raw.mockResolvedValue([["2026-01-01 00:00:00"]]);
      await expect(
        createRevision({
          target: "product", targetId: "p1", kind: "set_variants",
          payload: { variants: [entree], uniform_price: true },
          origin: "mcp", actor: ACTOR,
        }),
        `cas non rejeté : ${libelle}`,
      ).rejects.toThrow(RevisionError);
    }
  });

  it("rejette add_images/remove_image/set_variants sur une bannière", async () => {
    await expect(
      createRevision({
        target: "banner", targetId: "42", kind: "add_images",
        payload: { images: [{ key: "x", alt: null }] }, origin: "mcp", actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette remove_image sans image_id", async () => {
    await expect(
      createRevision({ target: "product", targetId: "p1", kind: "remove_image", payload: {}, origin: "mcp", actor: ACTOR }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejette set_variants sans tableau variants", async () => {
    await expect(
      createRevision({ target: "product", targetId: "p1", kind: "set_variants", payload: { uniform_price: true }, origin: "mcp", actor: ACTOR }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  // Item 6 (revue de phase) : le schéma Zod du MCP (`setVariantsSchema`)
  // défaute `uniform_price` à `true`, donc ce cas n'est pas atteignable par
  // les outils MCP aujourd'hui — mais la phase 3 (chat admin) dépose par le
  // même `createRevision`, sans passer par ce schéma. Sans ce contrôle,
  // l'aperçu (`parseSetVariantsPayload`, absent → lu comme `true`) et
  // l'application (`resolveVariantPrice`, absent → lu comme falsy)
  // montreraient deux prix différents pour la même révision.
  it("rejette set_variants sans uniform_price (booléen requis, pas seulement optionnel)", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);
    await expect(
      createRevision({
        target: "product", targetId: "p1", kind: "set_variants",
        payload: { variants: [{ color_name: "Noir", color_hex: "#000000", stock: 5, price: null }] },
        origin: "mcp", actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette set_variants avec uniform_price non booléen (ex. une chaîne)", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["2026-01-01T00:00:00.000Z"]] : []);
    await expect(
      createRevision({
        target: "product", targetId: "p1", kind: "set_variants",
        payload: { variants: [], uniform_price: "true" as unknown as boolean },
        origin: "mcp", actor: ACTOR,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
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
    // Prédicat 1 (bloquant course, revue de phase) : l'UPDATE de la cible ne
    // s'applique que si `updated_at` vaut encore la version lue au
    // pré-contrôle — sans lui, une écriture concurrente entre le
    // pré-contrôle et ce batch écraserait silencieusement la cible.
    expect(targetUpdate.sql).toMatch(/"updated_at" = \?/);
    expect(targetUpdate.params).toEqual(expect.arrayContaining(["2026-01-01 00:00:00"]));

    const appliedUpdate = stmts.find((s) => s.params.includes("applied"))!;
    expect(appliedUpdate).toBeDefined();
    expect(appliedUpdate.params).toEqual(expect.arrayContaining(["applied", ADMIN.id, "rev-1"]));
    // Prédicat 2 : ne marque cette révision "applied" que si elle est encore
    // "pending" au moment du batch — sinon une révision qu'une autre
    // application concurrente a déjà tranchée (superseded, ou rejetée entre
    // temps) resterait "applied" en plus de son statut réel.
    expect(appliedUpdate.params).toEqual(expect.arrayContaining(["pending"]));

    const supersedeUpdate = stmts.find((s) => s.params.includes("superseded"))!;
    expect(supersedeUpdate).toBeDefined();
    expect(supersedeUpdate.params).toEqual(["superseded", ADMIN.id, "product", "p1", "pending", "rev-1"]);

    const auditInsert = stmts.find(isAuditInsert)!;
    expect(auditInsert.params).toEqual(expect.arrayContaining([ADMIN.id, ADMIN.name, "revision.applied", "product", "p1"]));
  });

  // Bloquant de la revue de phase : sans les deux prédicats ci-dessus, une
  // écriture concurrente entre le pré-contrôle et ce batch (une autre
  // révision appliquée en même temps sur la même cible, ou une édition
  // directe du produit) laisse le batch committer quand même — une UPDATE à
  // 0 ligne n'est pas une erreur pour SQLite — et la révision reste marquée
  // "applied" alors que rien n'a atteint la cible. Simule exactement ce cas :
  // l'UPDATE de la cible "réussit" avec 0 ligne affectée.
  it("réconcilie sans mentir quand la cible a changé entre le pré-contrôle et le batch (course)", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      others: [],
    });
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] }, // cible : rien écrit
      { success: true, meta: { changes: 1 }, results: [] }, // révision marquée "applied" à tort
      { success: true, meta: { changes: 0 }, results: [] }, // supersede : aucune voisine ici
      { success: true, meta: { changes: 1 }, results: [] }, // audit "applied" (committé quand même)
    ]);

    const promise = applyRevision("rev-1", ADMIN);
    await expect(promise).rejects.toMatchObject({ code: "conflict" });
    await expect(promise).rejects.toThrow(/proposition fraîche/);

    // Un second batch de réconciliation a dû suivre le premier.
    expect(d1.current!.batch).toHaveBeenCalledTimes(2);
    const reconcileStmts = d1.current!.batchStatements(1);

    const revisionReset = reconcileStmts.find(
      (s) => /^update "content_revisions"/i.test(s.sql) && s.params.includes("pending"),
    )!;
    expect(revisionReset).toBeDefined();
    expect(revisionReset.params).toEqual(expect.arrayContaining(["pending", "rev-1", "applied"]));

    const conflictAudit = reconcileStmts.find(isAuditInsert)!;
    expect(conflictAudit).toBeDefined();
    expect(conflictAudit.params).toEqual(expect.arrayContaining(["revision.apply_conflict"]));
  });

  // Même scénario, mais avec une révision voisine que le premier batch a
  // superseded à tort (puisque l'écriture qui aurait dû la remplacer n'a en
  // réalité pas eu lieu) : elle aussi doit revenir "pending", pas rester
  // superseded par une application qui n'a rien écrit.
  it("remet aussi les révisions voisines en pending si le batch raté les avait superseded à tort", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      others: ["rev-2"],
    });
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] },
      { success: true, meta: { changes: 1 }, results: [] },
      { success: true, meta: { changes: 1 }, results: [] }, // rev-2 superseded à tort
      { success: true, meta: { changes: 1 }, results: [] },
    ]);

    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });

    const reconcileStmts = d1.current!.batchStatements(1);
    const neighborReset = reconcileStmts.find(
      (s) => /^update "content_revisions"/i.test(s.sql) && s.params.includes("rev-2"),
    )!;
    expect(neighborReset).toBeDefined();
    expect(neighborReset.params).toEqual(expect.arrayContaining(["pending", "rev-2", "superseded"]));
  });

  // Revue de phase (fix round 3) : course à TROIS révisions sur la même
  // cible. `otherIds` est lu AVANT le batch de rev-1 et contient donc les
  // deux sœurs encore "pending" à ce moment — y compris celle qui va
  // réellement gagner la course. Un contrôle qui se contente de
  // `status = "superseded"` sur ces ids ressusciterait alors une sœur que le
  // vrai gagnant venait de résoudre correctement. Le remède exact :
  // `meta.changes` de la PROPRE instruction de péremption du batch raté
  // (index 2) dit combien de sœurs CE batch a lui-même périmées — ici zéro,
  // puisque le gagnant avait déjà tout résolu avant que rev-1 n'exécute la
  // sienne.
  it("ne ressuscite aucune voisine déjà résolue par un autre batch gagnant (course à trois)", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      // Lues avant le batch de rev-1 : encore "pending" à cet instant, mais
      // un concurrent (le vrai gagnant) va résoudre les deux avant que le
      // batch de rev-1 ne s'exécute.
      others: ["rev-2", "rev-3"],
    });
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] }, // cible : le gagnant est passé avant
      { success: true, meta: { changes: 0 }, results: [] }, // rev-1 elle-même : déjà superseded par le gagnant
      { success: true, meta: { changes: 0 }, results: [] }, // NOTRE péremption : rien à périmer, déjà fait
      { success: true, meta: { changes: 1 }, results: [] }, // audit "applied" (committé quand même)
    ]);

    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });

    const reconcileStmts = d1.current!.batchStatements(1);
    // Aucune instruction ne doit toucher rev-2 ni rev-3 : notre propre
    // péremption n'a personne périmé (meta.changes = 0 à son index), donc
    // rien à leur sujet à réconcilier — elles restent superseded par le
    // vrai gagnant, à raison.
    const touchesNeighbors = reconcileStmts.some(
      (s) => s.params.includes("rev-2") || s.params.includes("rev-3"),
    );
    expect(touchesNeighbors).toBe(false);
    // Seules deux instructions : le reset (no-op ici, rev-1 n'est déjà plus
    // "applied") de rev-1, et l'audit de conflit.
    expect(reconcileStmts).toHaveLength(2);
  });

  // Point non bloquant de la revue de phase : si la réconciliation ELLE-MÊME
  // échoue (D1 injoignable), l'erreur d'origine (conflict) doit quand même
  // atteindre l'appelant — pas de reprise automatique — et une trace
  // distincte (`revision.reconcile_failed`) doit exister pour retrouver la
  // ligne plus tard.
  it("journalise l'échec de la réconciliation elle-même sans le masquer, si le second batch échoue", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      others: [],
    });
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] },
      { success: true, meta: { changes: 1 }, results: [] },
      { success: true, meta: { changes: 0 }, results: [] },
      { success: true, meta: { changes: 1 }, results: [] },
    ]);
    // La réconciliation (second batch) échoue à son tour.
    d1.current!.batch.mockRejectedValueOnce(new Error("D1 injoignable"));

    // Une seule invocation : `mockResolvedValueOnce`/`mockRejectedValueOnce`
    // ne sont consommés qu'une fois chacun, donc un second appel à
    // `applyRevision` retomberait sur le mock par défaut (succès) et ne
    // reproduirait pas ce scénario. La promesse peut en revanche être
    // attendue plusieurs fois.
    const promise = applyRevision("rev-1", ADMIN);
    await expect(promise).rejects.toMatchObject({ code: "conflict" });
    await expect(promise).rejects.toThrow(/proposition fraîche/);

    // Deux tentatives de batch : le batch principal, puis la réconciliation
    // ratée. Le fallback d'audit n'est pas un batch — c'est un insert isolé
    // (voir `run`, câblé au succès par défaut dans createD1Mock) — donc il
    // n'ajoute pas de troisième appel à `batch`.
    expect(d1.current!.batch).toHaveBeenCalledTimes(2);
    const fallbackAudit = d1.current!.boundMatching(/insert into "audit_log"/i).find(
      (s) => s.params.includes("revision.reconcile_failed"),
    );
    expect(fallbackAudit).toBeDefined();
  });

  // Bloquant 2 de la revue de phase précédente (liste blanche), re-vérifié
  // ici : `createRevision` la contrôle au dépôt, mais rien ne garantit
  // qu'une ligne `content_revisions` a toujours été déposée par elle — la
  // garantie ne doit pas dépendre de l'ordre dans lequel les chemins
  // d'écriture ont été livrés.
  it("re-vérifie la liste blanche à l'application, pas seulement au dépôt", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ is_draft: 1 }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  // B4 (§ 2.6) : `products.is_active = 0` retire la fiche de sa page, des
  // catégories et de la recherche — un canal de dépublication par la liste
  // blanche elle-même. Re-vérifié aux deux bouts, dépôt et application.
  it("rejette is_active dans le payload d'une révision produit, au dépôt", async () => {
    await expect(
      createRevision({
        target: "product", targetId: "p1", kind: "update", payload: { is_active: 0 }, origin: "mcp", actor: ADMIN,
      }),
    ).rejects.toMatchObject({ code: "validation_error", message: expect.stringContaining("is_active") });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("rejette is_active dans une révision produit déjà stockée, à l'application", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ is_active: 0 }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("une révision create n'est acceptée que sur une bannière, et ne dicte pas is_active côté produit", async () => {
    await expect(
      createRevision({ target: "product", targetId: "p1", kind: "create", payload: {}, origin: "mcp", actor: ADMIN }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("kind create active la bannière à l'application, sans que le payload ait à le dire", async () => {
    mockApplyReads({
      rev: revisionRow({ kind: "create", target_type: "banner", target_id: "42", payload: JSON.stringify({ content_html: "<p>Hi</p>" }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await applyRevision("rev-1", ADMIN);
    const targetUpdate = d1.current!.batchStatements().find((s) => /^update "banners"/i.test(s.sql))!;
    expect(targetUpdate.sql).toMatch(/"is_active" = \?/);
    expect(targetUpdate.params).toEqual(expect.arrayContaining([1, "<p>Hi</p>", 42]));
  });

  // Un payload de `publish` serait affiché « tel qu'il paraîtra » puis jeté :
  // `applyRevision` n'assigne jamais son payload.
  it("refuse un payload non vide pour publish, au dépôt", async () => {
    await expect(
      createRevision({
        target: "product", targetId: "p1", kind: "publish", payload: { name: "Autre nom" }, origin: "mcp", actor: ADMIN,
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("refuse un payload non vide pour publish, à l'application", async () => {
    mockApplyReads({
      rev: revisionRow({ kind: "publish", payload: JSON.stringify({ name: "Autre nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("kind publish met is_draft = 0 sur le produit cible", async () => {
    mockApplyReads({
      rev: revisionRow({ kind: "publish", payload: JSON.stringify({}) }),
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

  // ─── Généralisation des outils (dispatch tâche 7) : add_images, remove_image, set_variants ───
  //
  // Ces trois natures n'ont aucune colonne `products` à écrire : leur
  // écriture réelle vise une table enfant (product_images, product_variants),
  // jamais colonne par colonne sur la cible elle-même — seule `updated_at`
  // (l'ancre de concurrence) y change.

  it("add_images : une relecture post-batch en échec ne fait PAS échouer une application réussie", async () => {
    // Le batch a déjà committé quand `afterCommit` tourne : la révision est
    // durablement `applied`. Si la relecture — du meilleur effort, elle ne sert
    // qu'au nettoyage R2 — remontait son erreur, l'administrateur verrait un
    // échec pour un clic qui a marché, et un nouvel essai lui répondrait
    // « Révision déjà applied ». Rougit si le try/catch est retiré.
    mockApplyReads({
      rev: revisionRow({
        kind: "add_images",
        payload: JSON.stringify({ images: [{ key: "products/p1/a.jpg", alt: null }] }),
      }),
      targetVersion: "2026-01-01 00:00:00",
      others: [],
    });
    const base = d1.current!.raw.getMockImplementation()!;
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"product_images"\."id" in/i.test(stmt.sql)) throw new Error("D1 indisponible");
      return base(stmt);
    });

    await expect(applyRevision("rev-1", ADMIN)).resolves.toEqual({ applied: true, superseded: 0 });
  });

  it("applique une révision add_images : insère les lignes product_images, ne touche à aucune colonne produit hors updated_at", async () => {
    mockApplyReads({
      rev: revisionRow({
        kind: "add_images",
        payload: JSON.stringify({ images: [{ key: "products/p1/a.jpg", alt: "Photo" }] }),
      }),
      targetVersion: "2026-01-01 00:00:00",
      others: [],
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });

    const stmts = d1.current!.batchStatements();
    const targetUpdate = stmts.find((s) => /^update "products"/i.test(s.sql))!;
    expect(targetUpdate).toBeDefined();
    // Seule l'ancre de concurrence change sur products — aucune colonne de
    // contenu n'est écrite par une révision add_images.
    expect(targetUpdate.sql).toBe('update "products" set "updated_at" = datetime(\'now\') where ("products"."id" = ? and "products"."updated_at" = ?)');

    const imageInsert = stmts.find((s) => /^insert into "product_images"/i.test(s.sql));
    expect(imageInsert).toBeDefined();
    expect(imageInsert!.params).toEqual(expect.arrayContaining(["products/p1/a.jpg", "Photo"]));
    // Preuve de discrimination B1 : l'INSERT enfant lui-même porte la clause
    // de version de la cible (products.updated_at = version lue au
    // pré-contrôle), pas seulement le SELECT products.id qui le nourrit déjà —
    // ce test rougit si `eq(products.updated_at, current)` est retiré de
    // `insertRevisionImageStatement`.
    expect(imageInsert!.sql).toMatch(/"products"\."updated_at" = \?/);
    expect(imageInsert!.params).toContain("2026-01-01 00:00:00");
  });

  // B2 (revue de phase) : sans ce refus, D1 committerait quand même le batch
  // (une INSERT que la garde par ligne bloque ne compte pas comme une
  // erreur), la révision serait marquée "applied" alors qu'une partie des
  // images proposées n'a jamais atteint la fiche — "appliqué" ne doit jamais
  // vouloir dire "appliqué en partie".
  it("refuse d'appliquer une révision add_images qui dépasserait le plafond, sans rien écrire", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "add_images",
          payload: JSON.stringify({
            images: [{ key: "products/p1/a.jpg", alt: null }, { key: "products/p1/b.jpg", alt: null }],
          }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/from "product_images"/i.test(stmt.sql)) return [[11]]; // 11 déjà présentes ; 11 + 2 = 13 > 12
      return [];
    });

    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  // Round 2 de la revue de phase (« le reste de B2 ») : le pré-contrôle
  // ci-dessus est une LECTURE d'avant le batch, pas une garantie
  // transactionnelle. `actions/admin/images.ts` (chemin d'upload direct de
  // l'admin classique) insère dans `product_images` sur une fiche publiée
  // SANS jamais toucher `products.updated_at` — notre garde de version ne le
  // voit donc jamais passer. Simule ce cas : le pré-contrôle voit 0 image
  // (donc ne refuse rien), mais au moment du batch, une seule des deux images
  // proposées a pu passer la garde par ligne (le plafond a été atteint
  // entre-temps par ce chemin hors révision) — l'autre doit être détectée à
  // la relecture post-commit et son objet R2 nettoyé, exactement comme le
  // chemin brouillon (`addImagesFromUrls`, lib/db/product-drafts.ts) le fait
  // déjà.
  it("nettoie R2 de l'image add_images écartée entre le pré-contrôle et l'application (course avec un chemin hors révision)", async () => {
    let queriedIds: string[] = [];
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "add_images",
          payload: JSON.stringify({
            images: [{ key: "products/p1/a.jpg", alt: null }, { key: "products/p1/b.jpg", alt: null }],
          }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select count\(\*\) from "product_images"/i.test(stmt.sql)) return [[0]];
      if (/"product_images"\."id" in/i.test(stmt.sql)) {
        queriedIds = stmt.params as string[];
        // Seule la PREMIÈRE image (celle de "a.jpg") a atterri.
        return [[queriedIds[0]]];
      }
      return [];
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });

    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/b.jpg");
    expect(storageMocks.deleteFromR2).not.toHaveBeenCalledWith("products/p1/a.jpg");
    expect(storageMocks.deleteFromR2).toHaveBeenCalledTimes(1);
  });

  it("applique une révision remove_image : supprime la ligne product_images et efface l'objet R2 après le commit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({ kind: "remove_image", payload: JSON.stringify({ image_id: "img-1" }) })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1", "products/p1/old.jpg", 0]];
      return [];
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });

    const stmts = d1.current!.batchStatements();
    const imageDelete = stmts.find((s) => /^delete from "product_images"/i.test(s.sql));
    expect(imageDelete).toBeDefined();
    // "img-1" (l'image ciblée) PUIS les deux liants de `productVersionGuard`
    // (id du produit, version lue au pré-contrôle) — preuve de discrimination
    // B1 : ce test rougit si la clause EXISTS de la garde de version est
    // retirée de la suppression.
    expect(imageDelete!.params).toEqual(["img-1", "p1", "2026-01-01 00:00:00"]);
    expect(imageDelete!.sql).toMatch(/exists \(select 1 from "products"/);
    // Effacé APRÈS le commit du batch (voir le corps d'applyRevision) : le
    // fichier ne disparaît de R2 que si la ligne a réellement disparu de D1.
    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/old.jpg");
  });

  // Round 2 de la revue de phase : `afterCommit` de `remove_image` doit
  // s'ancrer sur le `meta.changes` du DELETE FILS lui-même (`results[0]` —
  // `extraStatements` est toujours en tête du batch), jamais sur celui de
  // `targetStatement`. Simule ici le cas où la cible a bien été touchée mais
  // où le DELETE, lui, n'a rien supprimé (ligne déjà absente, ou — avant ce
  // correctif — un ordre de batch qui aurait fait échouer sa garde de
  // version) : sans l'ancrage correct, `afterCommit` effacerait quand même le
  // fichier R2 d'une ligne qui n'a en réalité jamais disparu de D1.
  it("n'efface PAS l'objet R2 d'une révision remove_image si le DELETE fils n'a rien supprimé, même si la cible a changé", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({ kind: "remove_image", payload: JSON.stringify({ image_id: "img-1" }) })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1", "products/p1/old.jpg", 0]];
      return [];
    });
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] }, // DELETE fils (index 0, en tête du batch) : rien supprimé
      { success: true, meta: { changes: 1 }, results: [] }, // cible : changée quand même
      { success: true, meta: { changes: 1 }, results: [] }, // révision marquée applied
      { success: true, meta: { changes: 0 }, results: [] }, // supersede
      { success: true, meta: { changes: 1 }, results: [] }, // audit
    ]);

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });
    expect(storageMocks.deleteFromR2).not.toHaveBeenCalled();
  });

  it("applique une révision set_variants : insère la variante et écrit stock_quantity sur products", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "set_variants",
          payload: JSON.stringify({
            variants: [{ color_name: "Noir", color_hex: "#000000", price: null, stock: 5 }],
            uniform_price: true,
          }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select "base_price", "compare_price" from "products"/i.test(stmt.sql)) return [[100000, null]];
      if (/from "product_variants"/i.test(stmt.sql)) return [];
      return [];
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result).toEqual({ applied: true, superseded: 0 });

    const stmts = d1.current!.batchStatements();
    const targetUpdate = stmts.find((s) => /^update "products"/i.test(s.sql))!;
    expect(targetUpdate.sql).toMatch(/"stock_quantity" = \?/);
    expect(targetUpdate.params).toEqual(expect.arrayContaining([5]));

    const variantInsert = stmts.find((s) => /^insert into "product_variants"/i.test(s.sql));
    expect(variantInsert).toBeDefined();
    expect(variantInsert!.params).toEqual(expect.arrayContaining(["Noir", 100000, 5]));
    // Preuve de discrimination B1 : l'insertion de variante porte, elle
    // aussi, la clause de version — ce test rougit si
    // `insertRevisionVariantStatement` perd `eq(products.updated_at, current)`.
    expect(variantInsert!.sql).toMatch(/"products"\."updated_at" = \?/);
    expect(variantInsert!.params).toContain("2026-01-01 00:00:00");
  });

  // B1 (revue de phase) : couvre les trois écritures que
  // `buildSetVariantsStatements` peut produire en une seule application —
  // mise à jour d'une variante existante, suppression d'une variante retirée
  // (et détachement de ses images) — pour prouver que CHACUNE porte la garde
  // de version, pas seulement l'insertion déjà couverte ci-dessus.
  it("set_variants : la mise à jour, le détachement d'image et la suppression de variante portent toutes la clause de version", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) {
        return [revisionRow({
          kind: "set_variants",
          payload: JSON.stringify({
            variants: [{ color_name: "Noir", color_hex: "#000000", price: null, stock: 5 }],
            uniform_price: true,
          }),
        })];
      }
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select "base_price", "compare_price" from "products"/i.test(stmt.sql)) return [[100000, null]];
      // Deux variantes existantes : "Noir" (conservée → UPDATE) et "Blanc"
      // (absente du payload → DELETE + détachement de ses images).
      if (/^select "id", "attributes" from "product_variants"/i.test(stmt.sql)) {
        return [
          ["v-noir", JSON.stringify({ color: "Noir:#000000" })],
          ["v-blanc", JSON.stringify({ color: "Blanc:#ffffff" })],
        ];
      }
      return [];
    });

    await applyRevision("rev-1", ADMIN);

    const stmts = d1.current!.batchStatements();
    const variantUpdate = stmts.find((s) => /^update "product_variants"/i.test(s.sql) && s.params.includes("v-noir"))!;
    expect(variantUpdate).toBeDefined();
    expect(variantUpdate.sql).toMatch(/exists \(select 1 from "products"/);
    expect(variantUpdate.params).toEqual(expect.arrayContaining(["p1", "2026-01-01 00:00:00"]));

    const imageDetach = stmts.find((s) => /^update "product_images" set "variant_id"/i.test(s.sql))!;
    expect(imageDetach).toBeDefined();
    expect(imageDetach.sql).toMatch(/exists \(select 1 from "products"/);
    expect(imageDetach.params).toEqual(expect.arrayContaining(["v-blanc", "p1", "2026-01-01 00:00:00"]));

    const variantDelete = stmts.find((s) => /^delete from "product_variants"/i.test(s.sql))!;
    expect(variantDelete).toBeDefined();
    expect(variantDelete.sql).toMatch(/exists \(select 1 from "products"/);
    expect(variantDelete.params).toEqual(["v-blanc", "p1", "2026-01-01 00:00:00"]);
  });

  // B1 (revue de phase) : le test de course pré-existant ("réconcilie sans
  // mentir…", ci-dessus) ne couvrait que kind: "update" — exactement ce que
  // la revue a signalé comme la raison pour laquelle quatre relectures n'ont
  // pas vu que les trois natures enfant committaient quand même leur
  // écriture réelle même quand `targetStatement` ne matchait plus rien. Un
  // batch par nature, ici, pour que la réconciliation soit prouvée séparément
  // plutôt que supposée « couverte par ressemblance » avec update.
  it.each<[string, string]>([
    ["add_images", JSON.stringify({ images: [{ key: "products/p1/a.jpg", alt: null }] })],
    ["remove_image", JSON.stringify({ image_id: "img-1" })],
    [
      "set_variants",
      JSON.stringify({
        variants: [{ color_name: "Noir", color_hex: "#000000", price: null, stock: 5 }],
        uniform_price: true,
      }),
    ],
  ])("réconcilie sans mentir pour une révision %s quand la cible a changé entre le pré-contrôle et le batch (course)", async (kind, payload) => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (isGetRevisionSelect(stmt.sql)) return [revisionRow({ kind, payload })];
      if (isProductVersionSelect(stmt.sql)) return [["2026-01-01 00:00:00"]];
      if (isOthersSelect(stmt.sql)) return [];
      if (/^select "base_price", "compare_price" from "products"/i.test(stmt.sql)) return [[100000, null]];
      if (/from "product_variants"/i.test(stmt.sql)) return [];
      // Précis, et vérifié AVANT le motif générique `product_images`
      // ci-dessous : c'est le pré-contrôle de plafond d'`add_images` (B2), pas
      // la lecture de l'image à supprimer de `remove_image` — les deux
      // interrogent `product_images` mais pas avec la même forme de colonnes,
      // et les confondre ferait lire "img-1" comme un compte.
      if (/^select count\(\*\) from "product_images"/i.test(stmt.sql)) return [[0]];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1", "products/p1/old.jpg", 0]];
      return [];
    });
    // Ordre du batch (fixé par le correctif ci-dessus) : les écritures
    // enfant D'ABORD, puis la cible, puis la révision/le supersede/l'audit —
    // voir le commentaire au-dessus de la construction de `stmts` dans
    // `applyRevision`. Une vraie course (un autre batch gagnant entre le
    // pré-contrôle et celui-ci) fait échouer TOUTES les gardes de version à
    // l'identique, enfant compris : elles comparent toutes `current` à la
    // MÊME valeur figée au début de cette transaction.
    d1.current!.batch.mockResolvedValueOnce([
      { success: true, meta: { changes: 0 }, results: [] }, // écriture enfant : rien écrit non plus (même course, même garde)
      { success: true, meta: { changes: 0 }, results: [] }, // cible : rien écrit (course)
      { success: true, meta: { changes: 1 }, results: [] }, // révision marquée "applied" à tort
      { success: true, meta: { changes: 0 }, results: [] }, // supersede : aucune voisine ici
      { success: true, meta: { changes: 1 }, results: [] }, // audit "applied" (committé quand même)
    ]);

    const promise = applyRevision("rev-1", ADMIN);
    await expect(promise).rejects.toMatchObject({ code: "conflict" });
    await expect(promise).rejects.toThrow(/proposition fraîche/);

    // Un second batch de réconciliation a dû suivre le premier, exactement
    // comme pour kind: "update" — la réconciliation elle-même est agnostique
    // de la nature, mais rien ne le PROUVAIT pour ces trois-là avant ce test.
    expect(d1.current!.batch).toHaveBeenCalledTimes(2);
    const reconcileStmts = d1.current!.batchStatements(1);
    const revisionReset = reconcileStmts.find(
      (s) => /^update "content_revisions"/i.test(s.sql) && s.params.includes("pending"),
    )!;
    expect(revisionReset).toBeDefined();
    expect(revisionReset.params).toEqual(expect.arrayContaining(["pending", "rev-1", "applied"]));
  });

  // B3 (revue de phase) : `applyRevision` supersede déjà les révisions sœurs
  // pending de la même cible, mais `rejectRevision` refuse tout ce qui n'est
  // plus "pending" — une sœur `add_images` superseded ne peut donc plus jamais
  // être rejetée, et ses objets R2 (déjà téléversés au dépôt) restaient
  // orphelins pour toujours sans ce nettoyage-ci.
  it("efface les objets R2 des révisions add_images sœurs remplacées (superseded), pas seulement au rejet", async () => {
    mockApplyReads({
      rev: revisionRow({ payload: JSON.stringify({ name: "Nouveau nom" }) }),
      targetVersion: "2026-01-01 00:00:00",
      others: [
        {
          id: "rev-2",
          kind: "add_images",
          payload: JSON.stringify({ images: [{ key: "products/p1/old-a.jpg" }, { key: "products/p1/old-b.jpg" }] }),
        },
        { id: "rev-3", kind: "update", payload: JSON.stringify({ name: "Autre nom" }) },
      ],
    });

    const result = await applyRevision("rev-1", ADMIN);
    expect(result.superseded).toBe(2);

    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/old-a.jpg");
    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/old-b.jpg");
    // La sœur "update" n'a rien téléversé : aucun appel supplémentaire au-delà
    // des deux clés de la sœur add_images.
    expect(storageMocks.deleteFromR2).toHaveBeenCalledTimes(2);
  });

  it("re-vérifie la forme du payload à l'application pour les natures add_images/remove_image/set_variants", async () => {
    mockApplyReads({
      rev: revisionRow({ kind: "add_images", payload: JSON.stringify({}) }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  // Item 6, re-vérifié à l'application comme le reste de la forme du payload
  // (même principe que la liste blanche ci-dessus) : une ligne
  // `content_revisions` déposée sans passer par `createRevision` ne doit pas
  // pouvoir contourner ce contrôle non plus.
  it("re-vérifie uniform_price (booléen requis) à l'application pour set_variants", async () => {
    mockApplyReads({
      rev: revisionRow({
        kind: "set_variants",
        payload: JSON.stringify({ variants: [{ color_name: "Noir", color_hex: "#000000", stock: 5, price: null }] }),
      }),
      targetVersion: "2026-01-01 00:00:00",
    });
    await expect(applyRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
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
    // Une seule instruction dans le batch : l'UPDATE, seul — voir le
    // docstring de rejectRevision (l'audit n'est écrit qu'APRÈS confirmation
    // de son meta.changes, jamais dans le même batch qu'une écriture dont on
    // ne connaît pas encore l'issue).
    expect(stmts).toHaveLength(1);
    expect(stmts.some((s) => /"products"/i.test(s.sql))).toBe(false);
    expect(stmts.some((s) => /"banners"/i.test(s.sql))).toBe(false);

    const revisionUpdate = stmts.find((s) => /^update "content_revisions"/i.test(s.sql))!;
    expect(revisionUpdate.params).toEqual(expect.arrayContaining(["rejected", ADMIN.id, "rev-1"]));
    // Prédicat symétrique de celui d'applyRevision (revue de phase, fix
    // round 4) : ne marque "rejected" que si la révision est encore
    // "pending" au moment de l'écriture.
    expect(revisionUpdate.params).toEqual(expect.arrayContaining(["pending"]));

    // L'audit est un insert isolé, hors du batch — voir ci-dessus.
    const auditInsert = d1.current!.boundMatching(/insert into "audit_log"/i)[0];
    expect(auditInsert).toBeDefined();
    expect(auditInsert.params).toEqual(expect.arrayContaining([ADMIN.id, ADMIN.name, "revision.rejected", "product", "p1"]));
  });

  // Bloquant de la revue de phase (fix round 4), jumeau exact de celui fermé
  // sur applyRevision : deux résolutions concurrentes sur la même révision
  // (une application qui gagne, un rejet qui perd) ne doivent pas pouvoir
  // toutes les deux "réussir" — sinon la fiche est en ligne (l'application)
  // ET le journal affirme un rejet, deux histoires contradictoires.
  it("lève conflict si une autre résolution gagne la course pendant le rejet, et n'écrit pas l'audit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (isGetRevisionSelect(stmt.sql) ? [revisionRow()] : []));
    // Le pré-contrôle lit "pending" (mock ci-dessus), mais l'écriture
    // elle-même ne matche plus rien : une application concurrente a gagné
    // entre les deux.
    d1.current!.batch.mockResolvedValueOnce([{ success: true, meta: { changes: 0 }, results: [] }]);

    await expect(rejectRevision("rev-1", ADMIN)).rejects.toMatchObject({ code: "conflict" });

    // Rien n'a été journalisé : contrairement à applyRevision, il n'y a rien
    // à réconcilier ici puisque l'audit n'est écrit qu'après confirmation.
    const auditInsert = d1.current!.boundMatching(/insert into "audit_log"/i)[0];
    expect(auditInsert).toBeUndefined();
  });

  // ─── Cycle de vie R2 d'une révision add_images rejetée (dispatch tâche 7) ───
  //
  // Une révision `add_images` a déjà téléversé ses objets au dépôt
  // (lib/mcp/tools/products.ts) — jamais écrits en base tant qu'elle n'est
  // pas appliquée. La rejeter sans les effacer les rend orphelins dans R2
  // pour toujours : aucune ligne product_images ne les référencera jamais.

  it("efface les objets R2 d'une révision add_images rejetée", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      (isGetRevisionSelect(stmt.sql)
        ? [revisionRow({
            kind: "add_images",
            payload: JSON.stringify({ images: [{ key: "products/p1/a.jpg", alt: null }, { key: "products/p1/b.jpg", alt: "Photo" }] }),
          })]
        : []));

    const result = await rejectRevision("rev-1", ADMIN);
    expect(result).toEqual({ rejected: true });
    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/b.jpg");
    expect(storageMocks.deleteFromR2).toHaveBeenCalledTimes(2);
  });

  it("ne touche pas R2 en rejetant une révision update (rien n'a été téléversé au dépôt)", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (isGetRevisionSelect(stmt.sql) ? [revisionRow()] : []));
    await rejectRevision("rev-1", ADMIN);
    expect(storageMocks.deleteFromR2).not.toHaveBeenCalled();
  });
});
