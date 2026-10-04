/**
 * Mise en forme du rapport de dérive, en texte, pour un humain pressé.
 *
 * Deux exigences ont guidé la forme :
 *
 *  1. Le SENS de l'écart se lit avant son objet. « présent en base, non
 *     déclaré » n'est pas une sous-catégorie de « manquant » : c'est l'incident
 *     A, et il doit sauter aux yeux.
 *  2. Les rapprochements de noms s'impriment sous les deux écarts qu'ils
 *     relient, pas dans une section à part : un lecteur qui tombe sur
 *     « BRAVE_API_KEY absent » doit voir immédiatement que
 *     « BRAVE_SEARCH_API_KEY » existe.
 */

import type { Ecart, Gravite, SensEcart } from "./types";

const LIBELLE_SENS: Record<SensEcart, string> = {
  declare_absent: "DÉCLARÉ PAR LE CODE, ABSENT DE LA RÉALITÉ",
  present_non_declare: "PRÉSENT DANS LA RÉALITÉ, DÉCLARÉ NULLE PART",
  divergent: "PRÉSENT DES DEUX CÔTÉS, SOUS DES FORMES DIFFÉRENTES",
};

const MARQUEUR: Record<Gravite, string> = {
  erreur: "[!]",
  avertissement: "[~]",
  information: "[i]",
};

const ORDRE_SENS: SensEcart[] = ["present_non_declare", "declare_absent", "divergent"];
const ORDRE_GRAVITE: Gravite[] = ["erreur", "avertissement", "information"];

export interface Bilan {
  erreurs: number;
  avertissements: number;
  informations: number;
  /**
   * Vrai dès qu'il existe une ERREUR — et pas pour un avertissement.
   *
   * Un avertissement nomme un écart réel que personne N'A DÉCIDÉ DE PAYER
   * aujourd'hui : dix-huit clés primaires `TEXT` nullables, héritées de la
   * permissivité de SQLite, qu'on corrigerait en reconstruisant dix-huit tables — ce que
   * personne n'a décidé de faire. Les compter comme un échec rendait le travail nocturne rouge POUR
   * TOUJOURS, quoi qu'on tranche par ailleurs — mesuré : la production est à
   * zéro erreur et dix-neuf avertissements, et le contrôle sortait quand même
   * en 1.
   *
   * Un garde-fou rouge en permanence n'alerte plus personne : il apprend à
   * être ignoré, et c'est exactement ce qui a laissé la clé étrangère
   * d'`audit_log` survivre un an. Les avertissements restent IMPRIMÉS, en
   * toutes lettres, dans chaque rapport — ils ne disparaissent pas, ils
   * cessent seulement de crier.
   */
  derive: boolean;
}

export function bilan(ecarts: readonly Ecart[]): Bilan {
  const erreurs = ecarts.filter((e) => e.gravite === "erreur").length;
  const avertissements = ecarts.filter((e) => e.gravite === "avertissement").length;
  const informations = ecarts.filter((e) => e.gravite === "information").length;
  return { erreurs, avertissements, informations, derive: erreurs > 0 };
}

export interface OptionsRapport {
  /** Titre de la section, par exemple « BASE (lib/db/schema.ts ↔ D1 distante) ». */
  titre: string;
  /** Lignes d'en-tête : d'où viennent les deux descriptions comparées. */
  sources?: string[];
}

/**
 * Rend une section de rapport. Toujours non vide : quand il n'y a aucun écart,
 * elle le dit explicitement, parce qu'un rapport silencieux ne se distingue pas
 * d'un contrôle qui n'a pas tourné.
 */
export function formaterSection(ecarts: readonly Ecart[], options: OptionsRapport): string {
  const lignes: string[] = [];
  lignes.push(`── ${options.titre}`);
  for (const s of options.sources ?? []) lignes.push(`   ${s}`);
  lignes.push("");

  if (ecarts.length === 0) {
    lignes.push("   Aucun écart. Les deux descriptions concordent.");
    lignes.push("");
    return lignes.join("\n");
  }

  const tries = [...ecarts].sort((a, b) => {
    const ds = ORDRE_SENS.indexOf(a.sens) - ORDRE_SENS.indexOf(b.sens);
    if (ds !== 0) return ds;
    const dg = ORDRE_GRAVITE.indexOf(a.gravite) - ORDRE_GRAVITE.indexOf(b.gravite);
    if (dg !== 0) return dg;
    return a.cible.localeCompare(b.cible);
  });

  // Les écarts qui partagent un `motif` sont regroupés sous une explication
  // unique, à condition d'être au moins deux : un groupe d'un seul se lit mieux
  // comme un écart ordinaire.
  const effectifParMotif = new Map<string, number>();
  for (const e of tries) {
    if (e.motif) effectifParMotif.set(e.motif, (effectifParMotif.get(e.motif) ?? 0) + 1);
  }
  const groupe = (e: Ecart) => (e.motif && (effectifParMotif.get(e.motif) ?? 0) >= 2 ? e.motif : null);
  const motifsImprimes = new Set<string>();

  let sensCourant: SensEcart | null = null;
  for (const e of tries) {
    if (e.sens !== sensCourant) {
      sensCourant = e.sens;
      lignes.push(`   ${LIBELLE_SENS[e.sens]}`);
    }

    const m = groupe(e);
    if (m !== null) {
      if (motifsImprimes.has(m)) continue;
      motifsImprimes.add(m);
      const membres = tries.filter((x) => x.motif === m);
      lignes.push(`     ${MARQUEUR[e.gravite]} ${membres.length} écarts de même cause — ${e.motifLibelle ?? m}`);
      if (e.motifExplication) lignes.push(`         ${e.motifExplication}`);
      lignes.push(`         Concerne : ${membres.map((x) => x.cible).join(", ")}`);
      continue;
    }

    lignes.push(`     ${MARQUEUR[e.gravite]} ${e.cible}`);
    lignes.push(`         ${e.message}`);
    if (e.rapprochement) {
      lignes.push(`         ↳ rapprochement avec ${e.rapprochement.avec} : ${e.rapprochement.raison}`);
    }
  }
  lignes.push("");
  return lignes.join("\n");
}

export function formaterBilan(b: Bilan): string {
  if (!b.derive && b.avertissements === 0 && b.informations === 0) return "Bilan : aucun écart.";
  const parts = [`${b.erreurs} erreur(s)`, `${b.avertissements} avertissement(s)`];
  const suffixe = b.informations > 0 ? `, ${b.informations} information(s) (non comptée(s) comme écart)` : "";
  return `Bilan : ${parts.join(", ")}${suffixe}.`;
}
