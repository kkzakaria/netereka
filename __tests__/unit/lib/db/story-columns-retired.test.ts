import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));
vi.mock("@/lib/storage/fetch-image", () => ({ fetchAndUploadImage: vi.fn() }));

import { products } from "@/lib/db/schema";
import { PRODUCT_WRITABLE_COLUMN_LIST } from "@/lib/db/revisions";
import { getDraft, getProduct } from "@/lib/db/product-drafts";

/**
 * Les quatre colonnes Story retirées du code. `faq_html` n'en fait PAS partie :
 * c'est le porteur de la FAQ depuis la conversion, il reste.
 */
const RETIRED = ["tagline", "highlights", "feature_blocks", "faq"] as const;

beforeEach(() => {
  d1.current = createD1Mock();
});

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");

describe("colonnes Story retirées — le schéma", () => {
  it("`products` ne déclare plus aucune des quatre", () => {
    const columns = getTableColumns(products);
    const declared = new Set<string>([
      ...Object.keys(columns),
      // Le nom TypeScript et le nom SQL peuvent différer : on vérifie les deux.
      ...Object.values(columns).map((c) => c.name),
    ]);
    for (const column of RETIRED) {
      expect(declared.has(column), `le schéma redéclare \`${column}\``).toBe(false);
    }
  });

  it("`faq_html` est toujours là — sans quoi ce test passerait pour la mauvaise raison", () => {
    expect(Object.keys(getTableColumns(products))).toContain("faq_html");
  });
});

describe("colonnes Story retirées — la liste blanche des révisions", () => {
  it("aucune des quatre n'est écrivable par une révision", () => {
    for (const column of RETIRED) {
      expect(
        (PRODUCT_WRITABLE_COLUMN_LIST as readonly string[]).includes(column),
        `\`${column}\` est revenue dans PRODUCT_WRITABLE_COLUMN_LIST`,
      ).toBe(false);
    }
  });

  it("la liste blanche n'est pas vide — garde-fou du test ci-dessus", () => {
    expect(PRODUCT_WRITABLE_COLUMN_LIST).toContain("faq_html");
  });
});

/**
 * LE CAS DANGEREUX, et la raison pour laquelle une recherche textuelle ne
 * suffit pas : `getDraft` et `getProduct` (lib/db/product-drafts.ts) font un
 * `db.select()` SANS projection. Drizzle développe alors la liste EXPLICITE
 * des colonnes du schéma — c'est le schéma qui décide du SQL, pas le code
 * appelant. Un `DROP COLUMN` appliqué pendant qu'une version qui porte encore
 * ces colonnes dans son schéma sert le trafic ferait échouer ces deux
 * requêtes en « no such column ».
 *
 * On lit donc le SQL que Drizzle émet réellement, et non la forme du schéma :
 * c'est la seule assertion qui tienne sur ce que la base recevra.
 */
describe("colonnes Story retirées — le SQL réellement émis", () => {
  const cases: [string, () => Promise<unknown>][] = [
    ["getDraft", () => getDraft("p1")],
    ["getProduct", () => getProduct("p1")],
  ];

  for (const [name, call] of cases) {
    it(`${name} ne nomme aucune colonne Story`, async () => {
      // Les deux lèvent `not_found` sur le mock (aucune ligne rendue) : la
      // requête a déjà été compilée et liée, c'est tout ce qu'on observe ici.
      await expect(call()).rejects.toThrow();
      const statements = d1.current!.boundMatching(/from "products"/i);
      expect(statements.length, `${name} n'a émis aucune requête sur products`).toBeGreaterThan(0);
      const sql = statements.map(sqlOf).join(" ");
      for (const column of RETIRED) {
        expect(sql, `${name} nomme encore "${column}"`).not.toMatch(
          new RegExp(`"${column}"`, "i"),
        );
      }
      // La requête énumère bien les colonnes (sans projection) : si ce n'était
      // plus le cas, les assertions négatives ci-dessus passeraient à vide.
      expect(sql).toMatch(/"faq_html"/i);
    });
  }
});

/**
 * Balayage du dépôt, limité aux formes qui RÉFÉRENCENT une colonne : `p.faq`
 * (alias des requêtes SQL brutes de lib/db/products.ts, qui emploient
 * `SELECT p.*`) et `products.tagline` (référence Drizzle). Ces deux formes
 * n'apparaissent jamais en prose, contrairement aux noms nus — `tagline`,
 * `highlights` et `feature_blocks` figurent légitimement dans les commentaires
 * qui expliquent leur retrait et dans les messages de refus du contrat MCP, et
 * un filtre sur le nom nu punirait cette documentation au lieu de garder quoi
 * que ce soit.
 *
 * Ce balayage complète les trois blocs ci-dessus, il ne les remplace pas :
 * c'est le schéma qui décide du SQL émis, et aucune recherche textuelle ne
 * peut voir ce que `db.select()` développe.
 */
describe("colonnes Story retirées — aucune référence de colonne dans le code", () => {
  const ROOT = path.resolve(__dirname, "../../../..");
  // `faq_html` est exclu par la négation : c'est la colonne conservée.
  const PATTERN = "(^|[^_[:alnum:]])(p|products)\\.(tagline|highlights|feature_blocks|faq([^_[:alnum:]]|$))";

  it("ni `p.<colonne>` (SQL brut) ni `products.<colonne>` (Drizzle)", () => {
    // `git grep` plutôt qu'un parcours maison : il respecte .gitignore et ne
    // descend donc ni dans node_modules ni dans .next.
    let out = "";
    try {
      out = execFileSync(
        "git",
        [
          "grep", "-nIE", "--", PATTERN,
          "actions", "app", "components", "lib", "scripts", "stores", "workers",
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
    } catch (err) {
      // `git grep` sort en 1 quand il ne trouve rien : c'est le cas attendu.
      const status = (err as { status?: number }).status;
      if (status !== 1) throw err;
    }
    expect(out.trim().split("\n").filter(Boolean)).toEqual([]);
  });
});
