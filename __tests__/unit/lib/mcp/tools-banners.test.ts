import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";
import type { McpContext } from "@/lib/mcp/context";

const d1 = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

const mocks = vi.hoisted(() => ({ getBannerById: vi.fn() }));
vi.mock("@/lib/db/banners", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/banners")>()),
  getBannerById: mocks.getBannerById,
}));

import { createRevision } from "@/lib/db/revisions";
import { createBannerShape } from "@/lib/validations/mcp-banner";
import { bannerTools } from "@/lib/mcp/tools/banners";

// Ici `createRevision` est le VRAI : c'est lui qui assainit avec la portée de
// la cible, et c'est ce que ces tests doivent voir. Seul D1 est simulé.
const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
const tool = (name: string) => bannerTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

const STYLED = "<style>.a { color: red; }</style><div class=\"a\">Libre</div>";

const isRevisionInsert = (s: BoundStatement) => /insert into "content_revisions"/i.test(s.sql);
const isBannerInsert = (s: BoundStatement) => /insert into "banners"/i.test(s.sql);
/** Toute écriture sur la table banners, autre que l'INSERT d'une création. */
const isBannerRowWrite = (s: BoundStatement) => /^(update|delete from) "banners"/i.test(s.sql);

function allStatements(): BoundStatement[] {
  return d1.current!.bound.mock.calls.map((c) => c[0]);
}
function revisionPayload(): Record<string, unknown> {
  const all = [...d1.current!.batch.mock.calls.flatMap((c) => c[0]), ...allStatements()];
  const insert = all.find(isRevisionInsert)!;
  const json = insert.params.find((p): p is string => typeof p === "string" && p.startsWith("{"))!;
  return JSON.parse(json);
}

beforeEach(() => {
  // Bannière 42 : sans dates, sauf test contraire.
  mocks.getBannerById.mockReset().mockImplementation(async (id: number) => ({ id, starts_at: null, ends_at: null }));
  d1.current = createD1Mock();
  // Une bannière existe toujours (version lue) ; l'INSERT renvoie l'id 7 ;
  // SELECT max(display_order) → table non vide, dernier ordre 3.
  d1.current.raw.mockImplementation(async (stmt) => {
    if (isBannerInsert(stmt)) return [[7]];
    if (/max\(/i.test(stmt.sql)) return [[3]];
    if (/from "banners"/i.test(stmt.sql)) return [["2026-01-01 00:00:00"]];
    return [];
  });
});

describe("bannerTools", () => {
  it("expose list_banners, get_banner, set_banner_image, update_banner, create_banner, withdraw_banner", () => {
    expect(bannerTools.map((t) => t.name).sort()).toEqual(["create_banner", "get_banner", "list_banners", "set_banner_image", "update_banner", "withdraw_banner"]);
  });

  it("get_banner : not_found si la bannière n'existe pas", async () => {
    mocks.getBannerById.mockResolvedValue(null);
    d1.current!.raw.mockImplementation(async () => []);
    const r = await tool("get_banner").handler(ctx, { id: 99 });
    expect(parse(r).code).toBe("not_found");
  });

  it("update_banner dépose une révision scopée banner-<id> et n'écrit jamais la ligne", async () => {
    const r = await tool("update_banner").handler(ctx, { id: 42, content_html: STYLED });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.applied).toBe("revision");
    expect(out.revision.status).toBe("pending");

    const stored = revisionPayload();
    expect(stored.content_html).toContain(".desc-banner-42 .a");
    expect(stored.content_html).not.toContain(".desc-42 .a");
    // § 2.6 : aucun moyen de poser is_active depuis update_banner.
    expect(stored).not.toHaveProperty("is_active");
    expect(allStatements().some(isBannerRowWrite)).toBe(false);
    expect(allStatements().some(isBannerInsert)).toBe(false);
  });

  it("update_banner refuse un appel sans champ", async () => {
    const r = await tool("update_banner").handler(ctx, { id: 42 });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("validation_error");
    expect(allStatements().some(isRevisionInsert)).toBe(false);
  });

  it("update_banner refuse des dates inversées", async () => {
    const r = await tool("update_banner").handler(ctx, { id: 42, starts_at: "2026-02-01", ends_at: "2026-01-01" });
    expect(parse(r).code).toBe("validation_error");
  });

  it("update_banner sur une bannière absente : not_found, aucune révision", async () => {
    mocks.getBannerById.mockResolvedValue(null);
    d1.current!.raw.mockImplementation(async () => []);
    const r = await tool("update_banner").handler(ctx, { id: 99, title: "X" });
    expect(parse(r).code).toBe("not_found");
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("create_banner : ligne inactive et vide, puis révision d'activation scopée sur l'id créé", async () => {
    const r = await tool("create_banner").handler(ctx, { title: "Soldes", link_url: "/c/promo", content_html: STYLED });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.banner_id).toBe(7);
    expect(out.applied).toBe("revision");

    const insert = allStatements().find(isBannerInsert)!;
    // is_active = 0 et content_html = null dans l'INSERT : rien de visible ni de non assaini.
    expect(insert.params).toContain(0);
    expect(insert.params.some((p) => typeof p === "string" && p.includes("<"))).toBe(false);

    const stored = revisionPayload();
    // `is_active` ne voyage pas dans le payload : `applyRevision` l'écrit pour la nature `create`.
    expect(stored).not.toHaveProperty("is_active");
    expect(stored.content_html).toContain(".desc-banner-7 .a");
    const rev = d1.current!.batchStatements().find(isRevisionInsert)!;
    // Nature `create` (§ 2.7), pas `update` : c'est elle qui route l'écran vers l'objet entier.
    expect(rev.params).toContain("create");
    expect(rev.params).not.toContain("update");
    expect(rev.params).toContain("banner");
    expect(rev.params).toContain("7");
    // Aucune écriture directe ultérieure sur la ligne.
    expect(allStatements().some(isBannerRowWrite)).toBe(false);
  });

  it("create_banner : si la révision ne peut être déposée, la ligne créée est retirée", async () => {
    d1.current!.batch.mockRejectedValueOnce(new Error("d1 down"));
    const r = await tool("create_banner").handler(ctx, { title: "Soldes", link_url: "/c/promo" });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("internal_error");
    expect(allStatements().some((s) => /^delete from "banners"/i.test(s.sql) && s.params.includes(7))).toBe(true);
  });

  /**
   * Les assertions `some(isBannerRowWrite)).toBe(false)` ci-dessus ne valent
   * que si le motif reconnaît VRAIMENT le SQL de Drizzle. Le DELETE est prouvé
   * par le test précédent ; l'UPDATE ne l'était par rien — un jour où Drizzle
   * change de guillemets, ces assertions deviendraient vides sans rougir.
   * Ici le SQL est produit par Drizzle, pas écrit à la main.
   */
  it("le motif de non-écriture reconnaît l'UPDATE que Drizzle produirait", async () => {
    const { drizzle } = await import("drizzle-orm/d1");
    const { banners } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const sql = drizzle(d1.current!.binding as never)
      .update(banners).set({ title: "x" }).where(eq(banners.id, 42)).toSQL().sql;

    expect(isBannerRowWrite({ sql, params: [] })).toBe(true);
  });

  it("refuse un lien non relatif", () => {
    expect(createBannerShape.link_url.safeParse("https://evil.example").success).toBe(false);
  });
});

// B2 : le patch est partiel, la règle doit porter sur la paire FUSIONNÉE avec
// la ligne stockée — sinon elle ne peut jamais refuser un patch d'une seule date.
describe("update_banner : cohérence des dates contre la ligne stockée", () => {
  const stored = (starts_at: string | null, ends_at: string | null) =>
    mocks.getBannerById.mockResolvedValue({ id: 42, starts_at, ends_at });

  it("refuse ends_at seul antérieur à la starts_at stockée, sans déposer de révision", async () => {
    stored("2026-06-01", null);
    const r = await tool("update_banner").handler(ctx, { id: 42, ends_at: "2026-01-01" });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("validation_error");
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("refuse starts_at seul postérieur à la ends_at stockée", async () => {
    stored(null, "2026-01-01");
    const r = await tool("update_banner").handler(ctx, { id: 42, starts_at: "2026-06-01" });
    expect(parse(r).code).toBe("validation_error");
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });

  it("accepte ends_at seul postérieur à la starts_at stockée", async () => {
    stored("2026-01-01", null);
    const r = await tool("update_banner").handler(ctx, { id: 42, ends_at: "2026-06-01" });
    expect(r.isError).toBeUndefined();
  });

  it("null efface la date : plus de paire à comparer", async () => {
    stored("2026-06-01", "2026-07-01");
    const r = await tool("update_banner").handler(ctx, { id: 42, ends_at: null });
    expect(r.isError).toBeUndefined();
  });

  it("un patch sans date ne se heurte pas à des dates déjà incohérentes en base", async () => {
    stored("2026-06-01", "2026-01-01");
    const r = await tool("update_banner").handler(ctx, { id: 42, title: "Nouveau titre" });
    expect(r.isError).toBeUndefined();
  });
});

describe("révisions de bannière : les natures enfant restent refusées", () => {
  it.each([
    ["add_images", { images: [{ key: "k", alt: null }] }],
    ["remove_image", { image_id: "i1" }],
    ["set_variants", { variants: [], uniform_price: true }],
  ] as const)("%s sur une cible bannière est refusé au dépôt", async (kind, payload) => {
    await expect(
      createRevision({ target: "banner", targetId: "7", kind, payload, origin: "mcp", actor: { id: "a", name: "A" } }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(d1.current!.batch).not.toHaveBeenCalled();
  });
});
