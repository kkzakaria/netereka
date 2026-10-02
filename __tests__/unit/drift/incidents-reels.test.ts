/**
 * LA PREUVE : le moteur aurait-il attrapé les deux incidents du 2026-10-02 ?
 *
 * Ces tests ne vérifient pas que le moteur « fonctionne ». Ils rejouent deux
 * pannes de production et exigent que le moteur les nomme. S'ils passaient au
 * vert avec un moteur inerte, ils ne vaudraient rien — d'où les assertions
 * préalables sur la non-vacuité des deux descriptions comparées : un contrôle
 * de dérive qui compare deux listes vides est toujours vert.
 */

import { describe, it, expect } from "vitest";
import { comparerBase } from "@/lib/drift/comparer-base";
import { comparerLiaisons } from "@/lib/drift/comparer-liaisons";
import { formaterSection } from "@/lib/drift/rapport";
import type { FormeBase, FormeTable, LiaisonDeclaree, LiaisonReelle } from "@/lib/drift/types";
import { lireSchemaDeclare } from "../../../scripts/drift/lire-schema-drizzle";

describe("Incident A — une contrainte présente en base, jamais déclarée dans le code", () => {
  // Le côté « déclaré » n'est pas un objet de test : c'est le VRAI schéma
  // Drizzle, lu par le vrai lecteur. C'est ce qui rend ce test capable
  // d'échouer si quelqu'un ajoutait un jour cette clé étrangère à schema.ts
  // sans la poser en base, ou si le lecteur cessait de voir les clés
  // étrangères.
  const declare = lireSchemaDeclare();
  const auditDeclare = declare.tables.find((t) => t.nom === "audit_log");

  it("lit bien audit_log depuis le schéma Drizzle, et sans aucune clé étrangère", () => {
    expect(auditDeclare).toBeDefined();
    // Sans ces garde-fous, le test passerait avec un lecteur cassé.
    expect(auditDeclare!.colonnes.map((c) => c.nom)).toEqual([
      "id",
      "actor_id",
      "actor_name",
      "action",
      "target_type",
      "target_id",
      "details",
      "created_at",
    ]);
    expect(auditDeclare!.index.map((i) => i.nom).sort()).toEqual([
      "idx_audit_log_action",
      "idx_audit_log_actor",
      "idx_audit_log_created",
      "idx_audit_log_target",
    ]);
    // Le cœur de l'incident : le code n'en déclare aucune.
    expect(auditDeclare!.clesEtrangeres).toEqual([]);
  });

  it("rend un écart « présent en base, non déclaré » pour FOREIGN KEY (actor_id) REFERENCES users(id)", () => {
    // La base telle qu'elle était avant la migration 0023.
    const auditEnBase: FormeTable = {
      ...auditDeclare!,
      clesEtrangeres: [{ colonnes: ["actor_id"], tableCible: "users", colonnesCibles: ["id"] }],
      checksAnonymes: 0,
    };
    const reel: FormeBase = {
      tables: declare.tables.map((t) => (t.nom === "audit_log" ? auditEnBase : t)),
    };

    const ecarts = comparerBase(declare, reel);
    const surFk = ecarts.filter((e) => e.categorie === "cle_etrangere");

    expect(surFk).toHaveLength(1);
    expect(surFk[0].sens).toBe("present_non_declare");
    expect(surFk[0].gravite).toBe("erreur");
    expect(surFk[0].cible).toBe("audit_log(actor_id) → users(id)");
    expect(surFk[0].message).toContain("PRÉSENTE EN BASE");

    // Et rien d'autre ne bouge : la seule différence injectée est cette clé.
    expect(ecarts).toHaveLength(1);
  });

  it("ne rend aucun écart quand les deux descriptions concordent (le moteur sait aussi se taire)", () => {
    expect(comparerBase(declare, declare)).toEqual([]);
    expect(declare.tables.length).toBeGreaterThan(30);
  });
});

describe("Incident B — un nom déclaré dans le code, absent de la production", () => {
  const declarees: LiaisonDeclaree[] = [
    { nom: "DB", requise: true },
    // Ce que le code lisait : lib/media/image-search.ts → env.BRAVE_API_KEY
    { nom: "BRAVE_API_KEY", requise: true },
  ];
  const reelles: LiaisonReelle[] = [
    { nom: "DB", type: "d1", source: "version déployée" },
    // Ce que le Worker porte vraiment.
    { nom: "BRAVE_SEARCH_API_KEY", type: "secret_text", source: "wrangler secret list" },
  ];

  const ecarts = comparerLiaisons(declarees, reelles);

  it("rend DEUX écarts, un dans chaque sens", () => {
    expect(ecarts).toHaveLength(2);

    const manque = ecarts.find((e) => e.cible === "BRAVE_API_KEY");
    const surplus = ecarts.find((e) => e.cible === "BRAVE_SEARCH_API_KEY");

    expect(manque?.sens).toBe("declare_absent");
    expect(manque?.gravite).toBe("erreur");
    expect(surplus?.sens).toBe("present_non_declare");
    expect(surplus?.gravite).toBe("erreur");
  });

  it("rapproche les deux noms, de part et d'autre", () => {
    const manque = ecarts.find((e) => e.cible === "BRAVE_API_KEY")!;
    const surplus = ecarts.find((e) => e.cible === "BRAVE_SEARCH_API_KEY")!;

    expect(manque.rapprochement?.avec).toBe("BRAVE_SEARCH_API_KEY");
    expect(surplus.rapprochement?.avec).toBe("BRAVE_API_KEY");
    expect(manque.rapprochement?.raison).toContain("SEARCH");
  });

  it("rend le rapprochement évident pour un humain qui lit le rapport", () => {
    const texte = formaterSection(ecarts, { titre: "LIAISONS" });

    // Les deux noms figurent, chacun sous le libellé de son sens.
    expect(texte).toContain("PRÉSENT DANS LA RÉALITÉ, DÉCLARÉ NULLE PART");
    expect(texte).toContain("DÉCLARÉ PAR LE CODE, ABSENT DE LA RÉALITÉ");
    // Et chacun porte, sur sa propre ligne, le renvoi vers l'autre.
    const lignes = texte.split("\n");
    const ligneManque = lignes.findIndex((l) => l.trim().endsWith("BRAVE_API_KEY"));
    const ligneSurplus = lignes.findIndex((l) => l.trim().endsWith("BRAVE_SEARCH_API_KEY"));
    expect(ligneManque).toBeGreaterThanOrEqual(0);
    expect(ligneSurplus).toBeGreaterThanOrEqual(0);
    expect(lignes.slice(ligneManque, ligneManque + 3).join("\n")).toContain("BRAVE_SEARCH_API_KEY");
    expect(lignes.slice(ligneSurplus, ligneSurplus + 3).join("\n")).toContain("BRAVE_API_KEY");
  });

  it("DB, déclarée et présente, ne produit rien : le moteur ne crie pas sur ce qui va bien", () => {
    expect(ecarts.map((e) => e.cible).sort()).toEqual(["BRAVE_API_KEY", "BRAVE_SEARCH_API_KEY"]);
  });
});
