/**
 * Rapprochement de noms entre deux écarts de sens opposés.
 *
 * Né de l'incident B : le moteur rend deux faits — « BRAVE_API_KEY est déclarée
 * requise et absente » et « BRAVE_SEARCH_API_KEY est présente et non
 * déclarée ». Pris séparément, le premier se lit « il faut poser ce secret » et
 * le second « il faut supprimer ce secret » : les deux conclusions sont
 * fausses. Rapprochés, ils se lisent « le code et la production ne donnent pas
 * le même nom à la même chose », ce qui est le diagnostic.
 *
 * Deux heuristiques, délibérément conservatrices — un rapprochement faux est
 * pire qu'un rapprochement manquant, puisqu'il oriente vers une mauvaise
 * conclusion :
 *
 *  1. Inclusion de jetons : `BRAVE_API_KEY` → {BRAVE, API, KEY} est inclus dans
 *     `BRAVE_SEARCH_API_KEY` → {BRAVE, SEARCH, API, KEY}. Attrape les
 *     renommages par ajout ou retrait d'un qualificatif, qui sont le cas le
 *     plus fréquent.
 *  2. Distance d'édition courte : attrape les fautes de frappe
 *     (`BETTER_AUTH_SECERT`). Seuil serré, proportionnel à la longueur.
 *
 * Garde-fou contre le bruit : les jetons purement structurels (`API`, `KEY`,
 * `SECRET`, `ID`…) ne suffisent jamais à eux seuls. Sans cela `GOOGLE_CLIENT_ID`
 * et `FACEBOOK_APP_ID` se rapprocheraient, et le rapport mentirait.
 */

import type { Ecart } from "./types";

/** Jetons si courants dans les noms de secrets qu'ils ne distinguent rien. */
const JETONS_BANALS = new Set(["API", "KEY", "SECRET", "ID", "TOKEN", "URL", "CLIENT", "APP"]);

export function jetons(nom: string): string[] {
  return nom
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((j) => j.toUpperCase());
}

/** Distance de Levenshtein, deux lignes de travail. */
export function distanceEdition(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
    }
    precedente = courante;
  }
  return precedente[b.length];
}

export interface Proximite {
  proches: boolean;
  /** Formulation française de la raison, vide si `proches` est faux. */
  raison: string;
}

export function proximiteNoms(a: string, b: string): Proximite {
  if (a === b) return { proches: false, raison: "" };

  const ja = jetons(a);
  const jb = jetons(b);
  const sa = new Set(ja);
  const sb = new Set(jb);

  const inclus = (petit: Set<string>, grand: Set<string>) =>
    petit.size > 0 && [...petit].every((j) => grand.has(j));

  if (inclus(sa, sb) || inclus(sb, sa)) {
    const grand = sa.size >= sb.size ? sa : sb;
    const petit = sa.size >= sb.size ? sb : sa;
    const enPlus = [...grand].filter((j) => !petit.has(j));
    const distinctifs = [...petit].filter((j) => !JETONS_BANALS.has(j));
    if (distinctifs.length > 0 && enPlus.length > 0) {
      return {
        proches: true,
        raison: `même nom à « ${enPlus.join(", ")} » près`,
      };
    }
  }

  const d = distanceEdition(a, b);
  const seuil = Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.15));
  if (d <= seuil) {
    const communs = ja.filter((j) => sb.has(j) && !JETONS_BANALS.has(j));
    if (communs.length > 0) {
      return { proches: true, raison: `${d} caractère(s) d'écart — faute de frappe probable` };
    }
  }

  return { proches: false, raison: "" };
}

/**
 * Apparie les écarts `declare_absent` avec les `present_non_declare` du même
 * domaine dont le nom est proche, et renseigne `rapprochement` des deux côtés.
 *
 * Rend un nouveau tableau ; n'altère pas les écarts reçus. Chaque écart ne
 * reçoit qu'un seul rapprochement — le premier trouvé —, parce qu'une liste de
 * suspects n'aide personne.
 */
export function rapprocherEcarts(ecarts: readonly Ecart[]): Ecart[] {
  const sortie = ecarts.map((e) => ({ ...e }));
  const manques = sortie.filter((e) => e.sens === "declare_absent");
  const surplus = sortie.filter((e) => e.sens === "present_non_declare");

  for (const m of manques) {
    if (m.rapprochement) continue;
    for (const s of surplus) {
      if (s.rapprochement || s.domaine !== m.domaine || s.categorie !== m.categorie) continue;
      const { proches, raison } = proximiteNoms(m.cible, s.cible);
      if (!proches) continue;
      m.rapprochement = {
        avec: s.cible,
        raison: `${s.cible} est présent dans la réalité et n'est déclaré nulle part (${raison}) — renommage non répercuté plutôt qu'absence réelle ?`,
      };
      s.rapprochement = {
        avec: m.cible,
        raison: `${m.cible} est déclaré par le code et absent de la réalité (${raison}) — c'est probablement ce nom-ci que le code devrait lire.`,
      };
      break;
    }
  }

  return sortie;
}
