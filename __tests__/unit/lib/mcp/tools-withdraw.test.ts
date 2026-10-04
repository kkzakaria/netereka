import { describe, it, expect, vi, beforeEach } from "vitest";
import { textOf, type ToolResult } from "@/lib/mcp/result";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";
import type { McpContext } from "@/lib/mcp/context";

// Les outils de retrait, contre un vrai SQLite : ils DÉPOSENT, ils n'écrivent jamais.
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { productTools } from "@/lib/mcp/tools/products";
import { bannerTools } from "@/lib/mcp/tools/banners";
import { z } from "zod";
import { updateBannerShape } from "@/lib/validations/mcp-banner";
import { createRevision } from "@/lib/db/revisions";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
const product = (n: string) => productTools.find((t) => t.name === n)!;
const banner = (n: string) => bannerTools.find((t) => t.name === n)!;
const parse = (r: ToolResult) => JSON.parse(textOf(r));

let db: DatabaseSync;
beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  db.exec(`
    INSERT INTO categories (id, name, slug) VALUES ('c1', 'Téléphones', 'telephones');
    INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft) VALUES
      ('live', 'c1', 'En ligne', 'en-ligne', 10, 1, 0), ('draft', 'c1', 'Brouillon', 'brouillon', 10, 0, 1);
    INSERT INTO banners (id, title, link_url, is_active) VALUES (1, 'Active', '/x', 1), (2, 'Éteinte', '/x', 0);
  `);
});

describe("withdraw_product", () => {
  it("dépose une révision withdraw pending, avec la raison en résumé, sans toucher la fiche", async () => {
    const r = await product("withdraw_product").handler(ctx, { id: "live", reason: "Rupture définitive du fournisseur" });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.applied).toBe("revision");
    const rev = db.prepare("SELECT kind, status, payload, summary, origin FROM content_revisions WHERE id = ?").get(out.revision.id);
    expect(rev).toEqual({ kind: "withdraw", status: "pending", payload: "{}", summary: "Rupture définitive du fournisseur", origin: "mcp" });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'live'").get()).toEqual({ is_active: 1 });
  });

  it("refuse un brouillon et une fiche déjà retirée", async () => {
    expect(parse(await product("withdraw_product").handler(ctx, { id: "draft", reason: "x" })).code).toBe("validation_error");
    db.exec("UPDATE products SET is_active = 0 WHERE id = 'live'");
    expect(parse(await product("withdraw_product").handler(ctx, { id: "live", reason: "x" })).code).toBe("conflict");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });

  it("not_found pour un id inconnu", async () => {
    expect(parse(await product("withdraw_product").handler(ctx, { id: "nope", reason: "x" })).code).toBe("not_found");
  });
});

describe("reactivate_product", () => {
  beforeEach(() => {
    db.exec(`INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft) VALUES ('off', 'c1', 'Retirée', 'retiree', 10, 0, 0)`);
  });

  it("dépose une révision reactivate pending, avec la raison en résumé, sans toucher la fiche", async () => {
    const r = await product("reactivate_product").handler(ctx, { id: "off", reason: "Réassort reçu ce matin" });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.applied).toBe("revision");
    const rev = db.prepare("SELECT kind, status, payload, summary, origin FROM content_revisions WHERE id = ?").get(out.revision.id);
    expect(rev).toEqual({ kind: "reactivate", status: "pending", payload: "{}", summary: "Réassort reçu ce matin", origin: "mcp" });
    expect(db.prepare("SELECT is_active FROM products WHERE id = 'off'").get()).toEqual({ is_active: 0 });
  });

  it("refuse une fiche en ligne (conflict), un brouillon (validation_error) et un id inconnu (not_found)", async () => {
    expect(parse(await product("reactivate_product").handler(ctx, { id: "live", reason: "x" })).code).toBe("conflict");
    expect(parse(await product("reactivate_product").handler(ctx, { id: "draft", reason: "x" })).code).toBe("validation_error");
    expect(parse(await product("reactivate_product").handler(ctx, { id: "nope", reason: "x" })).code).toBe("not_found");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });

  it("exige une raison, comme withdraw_product", () => {
    const schema = z.object(product("reactivate_product").inputSchema);
    expect(schema.safeParse({ id: "off" }).success).toBe(false);
    expect(schema.safeParse({ id: "off", reason: "  " }).success).toBe(false);
    expect(schema.safeParse({ id: "off", reason: "Réassort" }).success).toBe(true);
  });
});

describe("withdraw_banner", () => {
  it("dépose sans désactiver la bannière", async () => {
    const r = await banner("withdraw_banner").handler(ctx, { id: 1, reason: "Fin de la promo" });
    const out = parse(r);
    expect(db.prepare("SELECT kind, status FROM content_revisions WHERE id = ?").get(out.revision.id)).toEqual({ kind: "withdraw", status: "pending" });
    expect(db.prepare("SELECT is_active FROM banners WHERE id = 1").get()).toEqual({ is_active: 1 });
  });

  it("refuse une bannière déjà inactive", async () => {
    expect(parse(await banner("withdraw_banner").handler(ctx, { id: 2, reason: "x" })).code).toBe("conflict");
  });
});

describe("update_banner porte une raison", () => {
  it("la raison devient le summary de la révision, et n'entre jamais dans le payload", async () => {
    const r = await banner("update_banner").handler(ctx, { id: 1, title: "Nouveau", reason: "Le titre annonçait la mauvaise promo" });
    const rev = db.prepare("SELECT summary, payload FROM content_revisions WHERE id = ?").get(parse(r).revision.id) as { summary: string; payload: string };
    expect(rev.summary).toBe("Le titre annonçait la mauvaise promo");
    expect(JSON.parse(rev.payload)).toEqual({ title: "Nouveau" });
  });

  it("elle est OPTIONNELLE (contrat des outils en service), mais jamais vide si elle est donnée", () => {
    const schema = z.object(updateBannerShape);
    expect(schema.safeParse({ id: 1, title: "X" }).success).toBe(true);
    expect(schema.safeParse({ id: 1, title: "X", reason: "   " }).success).toBe(false);
    expect(schema.safeParse({ id: 1, title: "X", reason: "Parce que" }).success).toBe(true);
  });

  it("update_product dépose la raison en summary sur une fiche publiée, sans la mêler au payload ; absente, summary null", async () => {
    const withReason = parse(await product("update_product").handler(ctx, { id: "live", pricing: { base_price: 20 }, reason: "Alignement concurrent" } as never));
    const rev = db.prepare("SELECT summary, payload FROM content_revisions WHERE id = ?").get(withReason.revision.id) as { summary: string; payload: string };
    expect(rev.summary).toBe("Alignement concurrent");
    expect(JSON.parse(rev.payload)).not.toHaveProperty("reason");
    const without = parse(await product("update_product").handler(ctx, { id: "live", pricing: { base_price: 30 } } as never));
    expect(db.prepare("SELECT summary FROM content_revisions WHERE id = ?").get(without.revision.id)).toEqual({ summary: null });
  });

  // Le `not.toHaveProperty` ci-dessus ne peut PAS échouer : `productColumnsForRevision`
  // est un bâtisseur par liste blanche, qui laisse tomber `reason` même si la
  // déstructuration de l'outil cessait de l'écarter. La garantie tient à deux couches ;
  // voici la seconde, celle qui peut rougir — si `reason` entrait dans les colonnes
  // inscriptibles d'un produit, cette révision serait acceptée.
  it("et si la raison atteignait le payload, la révision serait refusée (liste blanche)", async () => {
    await expect(
      createRevision({
        target: "product",
        targetId: "live",
        kind: "update",
        payload: { base_price: 20, reason: "Alignement concurrent" },
        origin: "mcp",
        actor: { id: "mcp-1", name: "Assistant" },
      }),
    ).rejects.toThrow(/non autoris/i);
  });

  it("le schéma d'update_product l'accepte optionnelle, et le brouillon (écriture directe) ne la reçoit pas", () => {
    const schema = z.object(product("update_product").inputSchema);
    expect(schema.safeParse({ id: "live", pricing: { base_price: 20 } }).success).toBe(true);
    expect(schema.safeParse({ id: "live", pricing: { base_price: 20 }, reason: "x" }).success).toBe(true);
    expect(schema.safeParse({ id: "live", pricing: { base_price: 20 }, reason: "" }).success).toBe(false);
  });
});

describe("update_banner ne retire plus", () => {
  it("is_active n'est plus dans le schéma d'entrée", () => {
    expect(updateBannerShape).not.toHaveProperty("is_active");
  });

  it("un is_active qui passerait quand même le schéma est refusé au dépôt, pas déposé", async () => {
    const r = await banner("update_banner").handler(ctx, { id: 1, is_active: false } as never);
    expect(parse(r).code).toBe("validation_error");
    expect(db.prepare("SELECT COUNT(*) n FROM content_revisions").get()).toEqual({ n: 0 });
  });
});
