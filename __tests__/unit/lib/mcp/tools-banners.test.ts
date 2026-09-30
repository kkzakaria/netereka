import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";
import type { McpContext } from "@/lib/mcp/context";

const d1 = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

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
  it("expose get_banner, update_banner, create_banner", () => {
    expect(bannerTools.map((t) => t.name).sort()).toEqual(["create_banner", "get_banner", "update_banner"]);
  });

  it("get_banner : not_found si la bannière n'existe pas", async () => {
    d1.current!.raw.mockImplementation(async () => []);
    const r = await tool("get_banner").handler(ctx, { id: 99 });
    expect(parse(r).code).toBe("not_found");
  });

  it("update_banner dépose une révision scopée banner-<id> et n'écrit jamais la ligne", async () => {
    const r = await tool("update_banner").handler(ctx, { id: 42, content_html: STYLED, is_active: true });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.applied).toBe("revision");
    expect(out.revision.status).toBe("pending");

    const stored = revisionPayload();
    expect(stored.content_html).toContain(".desc-banner-42 .a");
    expect(stored.content_html).not.toContain(".desc-42 .a");
    expect(stored.is_active).toBe(1);
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
    expect(stored.is_active).toBe(1);
    expect(stored.content_html).toContain(".desc-banner-7 .a");
    const rev = d1.current!.batchStatements().find(isRevisionInsert)!;
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

  it("refuse un lien non relatif", () => {
    expect(createBannerShape.link_url.safeParse("https://evil.example").success).toBe(false);
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
