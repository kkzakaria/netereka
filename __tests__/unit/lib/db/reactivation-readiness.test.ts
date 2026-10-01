import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * Les constats de l'écran d'une remise en ligne (§ 2.6 bis), mesurés contre un
 * vrai SQLite au schéma des migrations. Un constat calculé sur la mauvaise table
 * ou la mauvaise colonne y renvoie la mauvaise valeur : c'est ce que le mock D1
 * ne verrait jamais, et ce que cet écran affirme sans pouvoir le prouver à l'œil.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));

import { getReactivationReadiness } from "@/lib/db/reactivation-readiness";
import {
  isDescriptionEmpty,
  hasPurchasableStock,
  reactivationReading,
  reactivationWarnings,
} from "@/lib/revisions/reactivation-reading";

let db: DatabaseSync;

function seed() {
  db.exec(`
    INSERT INTO products (id, name, slug, base_price, is_active, is_draft, stock_quantity, description) VALUES
      ('ok',      'Fiche saine',        'saine',        10, 0, 0, 5,  '<p>Un vrai texte</p>'),
      ('noimg',   'Sans image',         'sans-image',   10, 0, 0, 5,  'Texte'),
      ('nopri',   'Sans principale',    'sans-pri',     10, 0, 0, 5,  'Texte'),
      ('nostock', 'Sans stock',         'sans-stock',   10, 0, 0, 0,  'Texte'),
      ('vzero',   'Variantes à zéro',   'vzero',        10, 0, 0, 99, 'Texte'),
      ('vok',     'Page en rupture',    'vok',          10, 0, 0, 0,  'Texte'),
      ('nodesc',  'Sans description',   'nodesc',       10, 0, 0, 5,  NULL),
      ('blank',   'Description vide',   'blank',        10, 0, 0, 5,  '<p>&nbsp;</p>'),
      ('other',   'Autre fiche',        'other',        10, 1, 0, 7,  'Texte');
    INSERT INTO product_images (id, product_id, url, is_primary, sort_order) VALUES
      ('i-ok', 'ok', 'a.webp', 1, 0), ('i-nostock', 'nostock', 'a.webp', 1, 0), ('i-vzero', 'vzero', 'a.webp', 1, 0),
      ('i-vok', 'vok', 'a.webp', 1, 0), ('i-nodesc', 'nodesc', 'a.webp', 1, 0), ('i-blank', 'blank', 'a.webp', 1, 0),
      ('i-nopri1', 'nopri', 'a.webp', 0, 0), ('i-nopri2', 'nopri', 'b.webp', 0, 1),
      ('i-other1', 'other', 'a.webp', 1, 0), ('i-other2', 'other', 'b.webp', 0, 1);
    INSERT INTO product_variants (id, product_id, name, price, stock_quantity, is_active) VALUES
      ('v1', 'vzero', 'Noir', 10, 0, 1), ('v2', 'vzero', 'Blanc', 10, 0, 1), ('v3', 'vzero', 'Ancienne', 10, 50, 0),
      ('v4', 'vok', 'Bleu', 10, 5, 1), ('v5', 'vok', 'Rouge', 10, 3, 1),
      ('v6', 'other', 'Autre', 10, 40, 1);
  `);
}

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  seed();
});

describe("getReactivationReadiness", () => {
  it("compte les images de CETTE fiche, et l'image principale à part", async () => {
    expect(await getReactivationReadiness("ok")).toMatchObject({ image_count: 1, has_primary_image: true });
    expect(await getReactivationReadiness("noimg")).toMatchObject({ image_count: 0, has_primary_image: false });
    // Deux images, aucune principale : les cartes n'en liront aucune. Les images de « other » ne comptent pas ici.
    expect(await getReactivationReadiness("nopri")).toMatchObject({ image_count: 2, has_primary_image: false });
    expect(await getReactivationReadiness("other")).toMatchObject({ image_count: 2, has_primary_image: true });
  });

  it("lit le stock de la fiche ET celui des variantes ACTIVES de cette fiche seulement", async () => {
    expect(await getReactivationReadiness("vzero")).toMatchObject({
      product_stock: 99, active_variant_count: 2, active_variant_stock: 0, active_variants_in_stock: 0, // v3 (inactive, 50) exclue
    });
    expect(await getReactivationReadiness("vok")).toMatchObject({ product_stock: 0, active_variant_count: 2, active_variant_stock: 8 });
    expect(await getReactivationReadiness("nostock")).toMatchObject({ product_stock: 0, active_variant_count: 0, active_variant_stock: 0 });
  });

  it("renvoie la description telle que stockée, et null pour une cible inconnue", async () => {
    expect((await getReactivationReadiness("nodesc"))?.description).toBeNull();
    expect((await getReactivationReadiness("ok"))?.description).toBe("<p>Un vrai texte</p>");
    expect(await getReactivationReadiness("nope")).toBeNull();
  });
});

describe("les avertissements, de la mesure à la phrase", () => {
  const codes = async (id: string) => reactivationWarnings((await getReactivationReadiness(id))!).map((w) => w.code);

  it("une fiche saine n'a aucun avertissement, et l'écran le DIT", async () => {
    expect(await codes("ok")).toEqual([]);
    expect(reactivationReading((await getReactivationReadiness("ok"))!).allClear).toMatch(/Aucun défaut/);
  });

  it("sans image : no_image ; images sans principale : no_primary_image, pas no_image", async () => {
    expect(await codes("noimg")).toEqual(["no_image"]);
    expect(await codes("nopri")).toEqual(["no_primary_image"]);
  });

  it("sans variante, le stock nul vient de la fiche", async () => {
    expect(await codes("nostock")).toEqual(["no_stock"]);
  });

  it("avec variantes, un stock de fiche à 99 ne masque pas des variantes toutes à zéro", async () => {
    // Lire products.stock_quantity seul dirait « en stock » : aucun client ne peut pourtant acheter cette fiche.
    const r = (await getReactivationReadiness("vzero"))!;
    expect(hasPurchasableStock(r)).toBe(false);
    expect(reactivationWarnings(r).map((w) => w.code)).toEqual(["no_stock", "stock_mismatch"]);
    expect(reactivationWarnings(r).find((w) => w.code === "stock_mismatch")!.text).toMatch(/« en stock » alors qu'aucune variante/);
  });

  it("avec variantes, un stock de fiche à 0 ne déclare pas la fiche invendable : la page affiche rupture, des variantes s'achètent", async () => {
    const r = (await getReactivationReadiness("vok"))!;
    expect(hasPurchasableStock(r)).toBe(true);
    expect(reactivationWarnings(r).map((w) => w.code)).toEqual(["stock_mismatch"]);
    expect(reactivationWarnings(r)[0].text).toMatch(/en rupture alors que des variantes sont achetables/);
  });

  it("description absente ou vide de HTML : no_description", async () => {
    expect(await codes("nodesc")).toEqual(["no_description"]);
    expect(await codes("blank")).toEqual(["no_description"]);
  });
});

describe("un stock négatif ne fait pas une fiche achetable", () => {
  it("+3 et -3 : la somme vaut 0 mais UNE variante a du stock ; -3 et -2 : rien d'achetable", async () => {
    db.exec(`
      INSERT INTO products (id, name, slug, base_price, is_active, is_draft, stock_quantity, description) VALUES
        ('neg1', 'Mixte', 'mixte', 10, 0, 0, 0, 'T'), ('neg2', 'Négatives', 'negatives', 10, 0, 0, 0, 'T');
      INSERT INTO product_variants (id, product_id, name, price, stock_quantity, is_active) VALUES
        ('n1', 'neg1', 'A', 10, 3, 1), ('n2', 'neg1', 'B', 10, -3, 1), ('n3', 'neg2', 'A', 10, -3, 1), ('n4', 'neg2', 'B', 10, -2, 1);
    `);
    const mixte = (await getReactivationReadiness("neg1"))!;
    expect(mixte).toMatchObject({ active_variant_stock: 0, active_variants_in_stock: 1 });
    expect(hasPurchasableStock(mixte)).toBe(true);
    expect(reactivationWarnings(mixte).map((w) => w.code)).not.toContain("no_stock");
    const neg = (await getReactivationReadiness("neg2"))!;
    expect(hasPurchasableStock(neg)).toBe(false);
    expect(reactivationWarnings(neg).map((w) => w.code)).toContain("no_stock");
  });
});

describe("isDescriptionEmpty", () => {
  it.each([
    [null, true], [undefined, true], ["", true], ["   ", true], ["<p></p>", true], ["<p>&nbsp;</p>", true],
    ["<style>.a{color:red}</style>", true], ["<div>\n</div>", true],
    ["Texte", false], ["<p>Texte</p>", false], ['<img src="a.webp">', false], ["<svg></svg>", false],
  ])("%j -> %s", (input, expected) => {
    expect(isDescriptionEmpty(input as string | null)).toBe(expected);
  });
});

describe("reactivationReading : ce qui ne se remet pas en ligne", () => {
  it("dit qu'une fiche déjà en ligne ne change rien, et qu'un brouillon se publie", async () => {
    expect(reactivationReading((await getReactivationReadiness("other"))!).notApplicable).toMatch(/déjà en ligne/);
    db.exec("UPDATE products SET is_draft = 1, is_active = 0 WHERE id = 'ok'");
    expect(reactivationReading((await getReactivationReadiness("ok"))!).notApplicable).toMatch(/publie/);
    expect(reactivationReading((await getReactivationReadiness("noimg"))!).notApplicable).toBeNull();
  });
});
