/**
 * Les collecteurs, éprouvés contre les VRAIS fichiers du dépôt.
 *
 * Un collecteur qui rend une liste vide rend un contrôle de dérive
 * perpétuellement vert. Chaque test ci-dessous vérifie donc d'abord qu'il a lu
 * quelque chose, puis qu'il l'a bien lu.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LIAISONS_DECLAREES } from "@/lib/drift/liaisons-declarees";
import { lireLiaisonsDeclarees } from "../../../scripts/drift/lire-env-dts";
import { lireSchemaDeclare } from "../../../scripts/drift/lire-schema-drizzle";
import { analyserChecks } from "../../../scripts/drift/lire-base-reelle";
import { varsDeWranglerJsonc, validerSecrets } from "../../../scripts/drift/lire-liaisons-reelles";
import { cheminEnvDts, racineDepot } from "../../../scripts/drift/racine";

describe("lire-env-dts — lecture d'env.d.ts par l'API du compilateur TypeScript", () => {
  const liaisons = lireLiaisonsDeclarees(cheminEnvDts());

  it("lit tous les champs de CloudflareEnv, requis et optionnels", () => {
    expect(liaisons.length).toBeGreaterThan(15);
    expect(liaisons.some((l) => l.nom === "DB" && l.requise)).toBe(true);
    expect(liaisons.some((l) => l.nom === "XAI_API_KEY" && !l.requise)).toBe(true);
  });

  it("ne se laisse pas tromper par un nom de variable cité dans un commentaire", () => {
    // env.d.ts contient, en commentaire, la phrase « ne pas le renommer en
    // BRAVE_API_KEY ». Une expression régulière y verrait un champ.
    // C'est précisément pourquoi on passe par le compilateur.
    expect(readFileSync(cheminEnvDts(), "utf8")).toContain("BRAVE_API_KEY");
    expect(liaisons.map((l) => l.nom)).not.toContain("BRAVE_API_KEY");
    expect(liaisons.map((l) => l.nom)).toContain("BRAVE_SEARCH_API_KEY");
  });

  it("lève plutôt que de rendre une liste vide quand l'interface est introuvable", () => {
    expect(() => lireLiaisonsDeclarees(path.join(racineDepot(), "package.json"))).toThrow(/introuvable/);
  });
});

describe("liaisons-declarees — le miroir d'exécution ne peut pas dériver de son original", () => {
  it("LIAISONS_DECLAREES est identique, nom par nom et « ? » par « ? », à env.d.ts", () => {
    const depuisLeType = lireLiaisonsDeclarees(cheminEnvDts());
    const tri = (a: { nom: string }, b: { nom: string }) => a.nom.localeCompare(b.nom);
    expect([...LIAISONS_DECLAREES].sort(tri)).toEqual([...depuisLeType].sort(tri));
    expect(LIAISONS_DECLAREES.length).toBeGreaterThan(15);
  });
});

describe("lire-schema-drizzle — introspection de lib/db/schema.ts", () => {
  const forme = lireSchemaDeclare();

  it("introspecte toutes les tables, avec colonnes, index et clés étrangères", () => {
    expect(forme.tables.length).toBeGreaterThan(30);
    expect(forme.tables.every((t) => t.colonnes.length > 0)).toBe(true);
    expect(forme.tables.some((t) => t.clesEtrangeres.length > 0)).toBe(true);
    expect(forme.tables.some((t) => t.index.length > 0)).toBe(true);
    expect(forme.tables.some((t) => t.checksNommes.length > 0)).toBe(true);
    expect(forme.tables.some((t) => t.unicites.length > 0)).toBe(true);
  });

  it("lit la clé primaire simple portée par la colonne", () => {
    expect(forme.tables.find((t) => t.nom === "audit_log")?.clePrimaire).toEqual(["id"]);
  });

  it("sait lire la colonne d'un index sur expression (idx_audit_log_created, DESC)", () => {
    // Si Drizzle changeait la forme de ses expressions, on rendrait `null` et
    // le moteur se tairait sur les colonnes : ce test attrape cette perte.
    const i = forme.tables.find((t) => t.nom === "audit_log")?.index.find((x) => x.nom === "idx_audit_log_created");
    expect(i?.colonnes).toEqual(["created_at"]);
  });

  it("range l'unicité d'une colonne dans `unicites`, jamais dans `index`", () => {
    // `.unique()` sur une colonne : drizzle-kit en fera un CREATE UNIQUE INDEX
    // nommé `<table>_<col>_unique` que SQLite rangera en origin 'c', alors
    // qu'une migration manuelle écrira un UNIQUE en ligne, anonyme. Comparer
    // ces noms produisait seize faux écarts sur la base de production.
    const t = forme.tables.find((x) => x.nom === "user")!;
    expect(t.unicites).toContainEqual(["email"]);
    expect(t.index.map((i) => i.nom)).not.toContain("user_email_unique");
    expect(t.index.every((i) => !i.unique)).toBe(true);
  });

  it("range un uniqueIndex() composite dans `unicites`, par ses colonnes", () => {
    const t = forme.tables.find((x) => x.nom === "wishlist")!;
    expect(t.unicites).toContainEqual(["user_id", "product_id"]);
  });

  it("résout la table cible d'une clé étrangère", () => {
    const fk = forme.tables.find((t) => t.nom === "reviews")?.clesEtrangeres;
    expect(fk).toContainEqual({ colonnes: ["product_id"], tableCible: "products", colonnesCibles: ["id"] });
  });
});

describe("analyserChecks — séparation des CHECK nommés et anonymes", () => {
  it("lit les CONSTRAINT … CHECK nommés (ai_config, tel qu'il est en production)", () => {
    const sql = `CREATE TABLE \`ai_config\` (
      \`id\` integer PRIMARY KEY NOT NULL,
      \`enabled\` integer DEFAULT 1 NOT NULL,
      CONSTRAINT "ai_config_singleton_id" CHECK("ai_config"."id" = 1),
      CONSTRAINT "ai_config_enabled_bool" CHECK("ai_config"."enabled" in (0, 1))
    )`;
    expect(analyserChecks(sql)).toEqual({
      nommes: ["ai_config_enabled_bool", "ai_config_singleton_id"],
      anonymes: 0,
    });
  });

  it("compte un CHECK en ligne comme anonyme (reviews, tel qu'il est en production)", () => {
    const sql = `CREATE TABLE "reviews" (
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT
    )`;
    expect(analyserChecks(sql)).toEqual({ nommes: [], anonymes: 1 });
  });

  it("ignore le mot CHECK à l'intérieur d'un littéral de chaîne", () => {
    const sql = `CREATE TABLE t (statut TEXT DEFAULT 'CHECK (faux)')`;
    expect(analyserChecks(sql)).toEqual({ nommes: [], anonymes: 0 });
  });

  it("ne trouve rien dans une table sans contrainte", () => {
    expect(analyserChecks(`CREATE TABLE t (id TEXT PRIMARY KEY)`)).toEqual({ nommes: [], anonymes: 0 });
  });
});

describe("varsDeWranglerJsonc — lecture du JSONC réel du dépôt", () => {
  it("lit les vars malgré les commentaires qui les entourent", () => {
    const vars = varsDeWranglerJsonc(path.join(racineDepot(), "wrangler.jsonc"));
    expect(vars).toContain("AI_IMAGE_MONTHLY_LIMIT");
  });

  it("ne confond pas un // à l'intérieur d'une chaîne avec un commentaire", () => {
    // wrangler.jsonc contient des URL et des chemins ; si le retrait des
    // commentaires mangeait une chaîne, l'analyse JSON lèverait.
    expect(() => varsDeWranglerJsonc(path.join(racineDepot(), "wrangler.jsonc"))).not.toThrow();
  });
});

/**
 * `validerSecrets` — le seul endroit où ce garde-fou peut devenir VERT À TORT.
 *
 * Le sens qui vaut le coup ici, « présent dans la réalité, déclaré nulle
 * part », ne se voit que si l'énumération des secrets est COMPLÈTE. Si
 * `wrangler secret list` changeait la forme de sa sortie, les entrées
 * deviendraient `undefined` : les secrets en trop disparaîtraient du rapport,
 * les liaisons requises resteraient satisfaites par la version déployée, et
 * le contrôle passerait au vert en ayant cessé de regarder. C'est pire que
 * pas de garde-fou, parce que cela rassure.
 */
describe("validerSecrets — échouer bruyamment plutôt que regarder ailleurs", () => {
  it("accepte la forme actuelle de wrangler", () => {
    expect(() => validerSecrets([{ name: "XAI_API_KEY", type: "secret_text" }])).not.toThrow();
  });

  /**
   * Une liste vide n'est PAS un état légitime : ce Worker ne démarre pas sans
   * `BETTER_AUTH_SECRET`, et la vitrine répond. Zéro secret veut donc dire
   * qu'on ne lit plus — et une lecture aveugle laisse passer tout le sens
   * « présent dans la réalité, déclaré nulle part », qui est la raison d'être
   * de ce contrôle. Le test précédent l'acceptait, ce qui en faisait le trou
   * exact que `validerSecrets` existe pour fermer.
   */
  it("refuse une liste vide : ce n'est pas la réalité qui s'est vidée, c'est la lecture", () => {
    expect(() => validerSecrets([])).toThrow(/AUCUN secret/);
  });

  it("refuse une sortie qui n'est pas une liste", () => {
    expect(() => validerSecrets({ secrets: [] })).toThrow(/forme inattendue/);
    expect(() => validerSecrets(null)).toThrow(/forme inattendue/);
  });

  // LE cas : un champ renommé. Sans ce contrôle, l'entrée passait et son nom
  // valait `undefined`.
  it("refuse une entrée dont le champ name a été renommé", () => {
    expect(() => validerSecrets([{ secretName: "XAI_API_KEY", type: "secret_text" }])).toThrow(/name` lisible/);
  });

  it("refuse un nom vide", () => {
    expect(() => validerSecrets([{ name: "", type: "secret_text" }])).toThrow(/name` lisible/);
  });
});
