/**
 * Moteur de comparaison, domaine « base ».
 *
 * Fonction pure : on lui passe ce que le code déclare (`lib/db/schema.ts`, lu
 * par `getTableConfig`) et ce que la base contient (`sqlite_master` et les
 * `PRAGMA`), elle rend la liste des écarts. Elle ne lit rien elle-même, ce qui
 * la rend testable sans base ni réseau — et c'est ce qui permet de rejouer les
 * deux incidents réels en test.
 *
 * CE QU'ELLE NE COMPARE PAS, ET POURQUOI :
 *
 *  - Les TYPES de colonnes. L'affinité SQLite est lâche (`TEXT`, `text`,
 *    `VARCHAR(50)`, `` : tout tombe dans quelques affinités) et Drizzle, D1 et
 *    les migrations écrites à la main n'orthographient pas les types de la même
 *    façon. Comparer produirait des dizaines de faux écarts sur une base saine,
 *    et un garde-fou qui crie à tort se fait désactiver.
 *
 *  - Les VALEURS PAR DÉFAUT. `(datetime('now'))`, `datetime('now')`,
 *    `(DATETIME('now'))` désignent la même chose et se réécrivent au gré des
 *    migrations ; `0` et `'0'` aussi. Je n'ai pas trouvé de normalisation en
 *    laquelle j'aurais confiance, donc je ne compare pas — et je le dis ici
 *    plutôt que de livrer un contrôle qui crie à tort. Conséquence assumée :
 *    une valeur par défaut divergente passe sous le radar.
 *
 *  - L'ORDRE DE TRI d'un index (`DESC`). Il est lisible des deux côtés, mais
 *    seulement au prix d'une lecture d'expression SQL côté Drizzle ; quand
 *    cette lecture échoue, `FormeIndex.colonnes` vaut `null` et la comparaison
 *    se limite à la présence. Voir `scripts/drift/lire-schema-drizzle.ts`.
 *
 *  - Les actions `ON DELETE` / `ON UPDATE` d'une clé étrangère. La présence de
 *    la contrainte est ce qui a cassé la production ; l'action est un raffinement
 *    que je préfère ne pas signaler plutôt que mal signaler.
 */

import { rapprocherEcarts } from "./noms-proches";
import type { Ecart, FormeBase, FormeCleEtrangere, FormeIndex, FormeTable } from "./types";

function cleFK(fk: FormeCleEtrangere): string {
  return `(${fk.colonnes.join(", ")}) → ${fk.tableCible}(${fk.colonnesCibles.join(", ")})`;
}

function cleUnique(colonnes: readonly string[]): string {
  return `(${colonnes.join(", ")})`;
}

function parNom<T extends { nom: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((i) => [i.nom, i]));
}

function colonnesIndex(i: FormeIndex): string {
  return i.colonnes === null ? "colonnes non lisibles" : i.colonnes.join(", ");
}

/**
 * @param declare ce que `lib/db/schema.ts` annonce
 * @param reel ce que la base contient vraiment
 */
export function comparerBase(declare: FormeBase, reel: FormeBase): Ecart[] {
  const ecarts: Ecart[] = [];
  const tablesDeclarees = parNom(declare.tables);
  const tablesReelles = parNom(reel.tables);

  for (const t of declare.tables) {
    if (!tablesReelles.has(t.nom)) {
      ecarts.push({
        domaine: "base",
        categorie: "table",
        sens: "declare_absent",
        gravite: "erreur",
        cible: t.nom,
        message: `Table « ${t.nom} » déclarée dans lib/db/schema.ts, introuvable en base. Toute requête qui la touche échouera.`,
      });
    }
  }

  for (const t of reel.tables) {
    if (!tablesDeclarees.has(t.nom)) {
      ecarts.push({
        domaine: "base",
        categorie: "table",
        sens: "present_non_declare",
        gravite: "erreur",
        cible: t.nom,
        message: `Table « ${t.nom} » présente en base, déclarée nulle part dans lib/db/schema.ts. Soit elle est morte et doit être supprimée, soit elle est vivante et le schéma ment.`,
      });
    }
  }

  for (const d of declare.tables) {
    const r = tablesReelles.get(d.nom);
    if (r) ecarts.push(...comparerTable(d, r));
  }

  return rapprocherEcarts(ecarts);
}

function comparerTable(d: FormeTable, r: FormeTable): Ecart[] {
  const ecarts: Ecart[] = [];
  const t = d.nom;

  // --- Colonnes -------------------------------------------------------------
  const colD = parNom(d.colonnes);
  const colR = parNom(r.colonnes);

  for (const c of d.colonnes) {
    if (colR.has(c.nom)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "colonne",
      sens: "declare_absent",
      gravite: "erreur",
      cible: `${t}.${c.nom}`,
      message: `Colonne « ${t}.${c.nom} » déclarée, absente de la base. Toute lecture ou écriture qui la nomme échouera.`,
    });
  }

  for (const c of r.colonnes) {
    if (colD.has(c.nom)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "colonne",
      sens: "present_non_declare",
      gravite: "erreur",
      cible: `${t}.${c.nom}`,
      message: `Colonne « ${t}.${c.nom} » présente en base, non déclarée. Une recréation de table depuis le seul schéma Drizzle la perdrait en silence, avec ses données.`,
    });
  }

  const estClePrimaire = new Set(d.clePrimaire);
  for (const c of d.colonnes) {
    const rc = colR.get(c.nom);
    if (!rc || rc.nonNul === c.nonNul) continue;

    if (c.nonNul && estClePrimaire.has(c.nom)) {
      // Héritage SQLite : une PRIMARY KEY qui n'est pas un INTEGER n'implique
      // PAS NOT NULL — un bug historique que SQLite conserve par compatibilité.
      // drizzle-kit écrit donc `PRIMARY KEY NOT NULL` explicitement, alors que
      // les migrations écrites à la main de ce dépôt écrivaient
      // `id TEXT PRIMARY KEY` tout court. L'écart est RÉEL (ces tables
      // accepteraient un identifiant NULL), mais systémique et sans incident
      // connu : avertissement, pas erreur, et le message nomme la cause pour
      // qu'un lecteur regroupe les occurrences d'un coup d'œil.
      ecarts.push({
        domaine: "base",
        categorie: "nullabilite",
        sens: "divergent",
        gravite: "avertissement",
        cible: `${t}.${c.nom}`,
        message: `Clé primaire « ${t}.${c.nom} » déclarée NOT NULL, nullable en base.`,
        motif: "cle_primaire_texte_sans_not_null",
        motifLibelle: "clé primaire TEXT déclarée NOT NULL, nullable en base",
        motifExplication:
          "En SQLite, une PRIMARY KEY qui n'est pas un INTEGER n'impose PAS NOT NULL — compatibilité historique. drizzle-kit écrit donc « PRIMARY KEY NOT NULL » explicitement, alors que les migrations écrites à la main de ce dépôt écrivaient « id TEXT PRIMARY KEY » tout court. Ces tables acceptent donc un identifiant NULL, ce que le schéma Drizzle affirme impossible. Réel, systémique, sans incident connu : à corriger par une réécriture de table le jour où l'une d'elles est reconstruite.",
      });
      continue;
    }

    ecarts.push({
      domaine: "base",
      categorie: "nullabilite",
      sens: "divergent",
      gravite: "erreur",
      cible: `${t}.${c.nom}`,
      message: c.nonNul
        ? `Colonne « ${t}.${c.nom} » déclarée NOT NULL, nullable en base. Le type TypeScript ment : des null atteindront le code.`
        : `Colonne « ${t}.${c.nom} » déclarée nullable, NOT NULL en base. Une insertion sans cette valeur sera rejetée en production et nulle part ailleurs.`,
    });
  }

  // --- Clé primaire ---------------------------------------------------------
  if (d.clePrimaire.join(",") !== r.clePrimaire.join(",")) {
    ecarts.push({
      domaine: "base",
      categorie: "cle_primaire",
      sens: "divergent",
      gravite: "erreur",
      cible: t,
      message: `Clé primaire de « ${t} » : déclarée (${d.clePrimaire.join(", ") || "aucune"}), en base (${r.clePrimaire.join(", ") || "aucune"}).`,
    });
  }

  // --- Index nommés, NON UNIQUES --------------------------------------------
  // Les index uniques sont traités plus bas, par colonnes : leur nom diffère
  // selon que la table vient de drizzle-kit ou d'une migration manuelle.
  const idxD = parNom(d.index);
  const idxR = parNom(r.index);

  for (const i of d.index) {
    if (idxR.has(i.nom)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "index",
      sens: "declare_absent",
      gravite: "erreur",
      cible: `${t}.${i.nom}`,
      message: `Index « ${i.nom} » (${t} : ${colonnesIndex(i)}) déclaré, absent de la base. Les requêtes qu'il devait servir font un balayage complet.`,
    });
  }

  for (const i of r.index) {
    if (idxD.has(i.nom)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "index",
      sens: "present_non_declare",
      gravite: "erreur",
      cible: `${t}.${i.nom}`,
      message: `Index « ${i.nom} » (${t} : ${colonnesIndex(i)}) présent en base, non déclaré. Une recréation de table depuis le schéma Drizzle le perdrait sans rien dire.`,
    });
  }

  for (const i of d.index) {
    const ri = idxR.get(i.nom);
    if (!ri) continue;
    if (i.colonnes !== null && ri.colonnes !== null && i.colonnes.join(",") !== ri.colonnes.join(",")) {
      ecarts.push({
        domaine: "base",
        categorie: "index",
        sens: "divergent",
        gravite: "erreur",
        cible: `${t}.${i.nom}`,
        message: `Index « ${i.nom} » : colonnes déclarées (${i.colonnes.join(", ")}), colonnes en base (${ri.colonnes.join(", ")}).`,
      });
    }
    if (i.unique !== ri.unique) {
      ecarts.push({
        domaine: "base",
        categorie: "index",
        sens: "divergent",
        gravite: "erreur",
        cible: `${t}.${i.nom}`,
        message: `Index « ${i.nom} » : ${i.unique ? "déclaré UNIQUE, non unique en base" : "déclaré non unique, UNIQUE en base"}.`,
      });
    }
  }

  // --- Unicité --------------------------------------------------------------
  // Comparée par liste de colonnes, jamais par nom : voir FormeTable.unicites.
  const uniD = new Set(d.unicites.map(cleUnique));
  const uniR = new Set(r.unicites.map(cleUnique));

  for (const u of uniD) {
    if (uniR.has(u)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "contrainte_unique",
      sens: "declare_absent",
      gravite: "erreur",
      cible: `${t}${u}`,
      message: `Unicité ${u} déclarée sur « ${t} », absente de la base — sous aucune forme (ni index unique, ni contrainte en ligne). Les doublons que le code croit impossibles sont possibles.`,
    });
  }

  for (const u of uniR) {
    if (uniD.has(u)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "contrainte_unique",
      sens: "present_non_declare",
      gravite: "erreur",
      cible: `${t}${u}`,
      message: `Unicité ${u} présente en base sur « ${t} », déclarée nulle part. Une insertion que le code juge légitime sera rejetée en production, et nulle part ailleurs.`,
    });
  }

  // --- Clés étrangères ------------------------------------------------------
  // C'est l'incident A. Le sens « présente en base, non déclarée » est celui
  // qui a coûté la production : aucune écriture d'audit n'aboutissait.
  const fkD = new Set(d.clesEtrangeres.map(cleFK));
  const fkR = new Set(r.clesEtrangeres.map(cleFK));

  for (const k of fkD) {
    if (fkR.has(k)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "cle_etrangere",
      sens: "declare_absent",
      gravite: "erreur",
      cible: `${t}${k}`,
      message: `Clé étrangère ${t}${k} déclarée, absente de la base. L'intégrité référentielle sur laquelle le code s'appuie n'est pas tenue.`,
    });
  }

  for (const k of fkR) {
    if (fkD.has(k)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "cle_etrangere",
      sens: "present_non_declare",
      gravite: "erreur",
      cible: `${t}${k}`,
      message: `Clé étrangère ${t}${k} PRÉSENTE EN BASE et déclarée nulle part. Le schéma Drizzle n'en sait rien, donc db:generate ne proposera jamais de la retirer et aucune base locale ne la reproduit : une écriture qui la viole échouera en production seulement.`,
    });
  }

  // --- Contraintes CHECK ----------------------------------------------------
  // Seuls les noms sont comparés. L'expression ne l'est pas, pour la même
  // raison que les valeurs par défaut : elle se réécrit (`"t"."rating"` contre
  // `rating`) sans changer de sens.
  const ckD = new Set(d.checksNommes);
  const ckR = new Set(r.checksNommes);
  const manquants = [...ckD].filter((n) => !ckR.has(n));

  for (const n of manquants) {
    // Une table créée par une migration écrite à la main porte des CHECK en
    // ligne, que SQLite stocke sans nom. Annoncer « contrainte absente »
    // alors qu'elle est là, juste anonyme, serait crier à tort.
    const anonymeDisponible = r.checksAnonymes > 0;
    ecarts.push({
      domaine: "base",
      categorie: "contrainte_check",
      sens: anonymeDisponible ? "divergent" : "declare_absent",
      gravite: anonymeDisponible ? "avertissement" : "erreur",
      cible: `${t}.${n}`,
      message: anonymeDisponible
        ? `Contrainte CHECK « ${n} » déclarée nommée sur « ${t} » ; la base porte ${r.checksAnonymes} CHECK sans nom sur cette table. Probablement la même contrainte, écrite en ligne par une migration manuelle. Le moteur ne compare pas les expressions : à vérifier à l'œil.`
        : `Contrainte CHECK « ${n} » déclarée sur « ${t} », absente de la base — et aucune contrainte anonyme qui pourrait en tenir lieu. L'invariant n'est pas tenu.`,
    });
  }

  for (const n of ckR) {
    if (ckD.has(n)) continue;
    ecarts.push({
      domaine: "base",
      categorie: "contrainte_check",
      sens: "present_non_declare",
      gravite: "erreur",
      cible: `${t}.${n}`,
      message: `Contrainte CHECK « ${n} » présente en base sur « ${t} », non déclarée. Une écriture que le code juge valide peut être rejetée en production.`,
    });
  }

  return ecarts;
}
