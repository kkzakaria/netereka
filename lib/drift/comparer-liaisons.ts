/**
 * Moteur de comparaison, domaine « liaisons » (bindings, secrets, vars).
 *
 * Fonction pure, comme `comparerBase` : on lui passe ce que le code déclare
 * (l'interface `CloudflareEnv` d'`env.d.ts`) et ce que le Worker porte
 * vraiment, elle rend les écarts.
 *
 * On compare les NOMS et leur présence, jamais les valeurs. Une valeur de
 * secret n'a rien à faire dans un rapport, et de toute façon l'API Cloudflare
 * ne la rend pas.
 *
 * L'optionalité (`?` dans `env.d.ts`) est portée par `LiaisonDeclaree.requise`
 * et elle a un sens opérationnel ici :
 *   - requise absente        → erreur ;
 *   - optionnelle absente    → information, jamais un écart (le code a prévu
 *                              ce cas et répond un échec typé) ;
 *   - présente non déclarée  → erreur, dans les deux cas.
 *
 * Ce dernier point est volontaire et c'est la moitié qu'un contrôle ordinaire
 * oublie. Un secret posé sur le Worker que plus aucun code ne lit, c'est au
 * mieux un oubli de ménage, au pire la moitié visible d'une faute de nom —
 * exactement l'incident B.
 */

import { rapprocherEcarts } from "./noms-proches";
import type { Ecart, LiaisonDeclaree, LiaisonReelle } from "./types";

export interface OptionsLiaisons {
  /**
   * Signaler les liaisons présentes et non déclarées. Vrai par défaut : c'est
   * le sens que l'incident A impose de traiter en première classe.
   *
   * Le mettre à faux sert à comparer deux descriptions dont on sait que l'une
   * est partielle — par exemple les `vars` de `wrangler.jsonc` (qui ne
   * prétendent pas énumérer les secrets) face aux liaisons de la version
   * déployée.
   */
  signalerNonDeclarees?: boolean;
  /** Nom de la description déclarante, pour les messages. */
  sourceDeclaration?: string;
}

export function comparerLiaisons(
  declarees: readonly LiaisonDeclaree[],
  reelles: readonly LiaisonReelle[],
  options: OptionsLiaisons = {},
): Ecart[] {
  const { signalerNonDeclarees = true, sourceDeclaration = "env.d.ts" } = options;

  const ecarts: Ecart[] = [];
  const parNom = new Map(reelles.map((r) => [r.nom, r]));
  const declarees_ = new Set(declarees.map((d) => d.nom));

  for (const d of declarees) {
    if (parNom.has(d.nom)) continue;
    if (d.requise) {
      ecarts.push({
        domaine: "liaisons",
        categorie: "liaison",
        sens: "declare_absent",
        gravite: "erreur",
        cible: d.nom,
        message: `« ${d.nom} » est déclarée NON optionnelle dans ${sourceDeclaration} et n'existe pas dans la réalité. Le code la lira comme undefined sans que rien ne l'avertisse.`,
      });
    } else {
      ecarts.push({
        domaine: "liaisons",
        categorie: "liaison",
        sens: "declare_absent",
        gravite: "information",
        cible: d.nom,
        message: `« ${d.nom} » est déclarée optionnelle dans ${sourceDeclaration} et absente. Autorisé — le code doit répondre un échec typé qui la nomme.`,
      });
    }
  }

  if (signalerNonDeclarees) {
    for (const r of reelles) {
      if (declarees_.has(r.nom)) continue;
      ecarts.push({
        domaine: "liaisons",
        categorie: "liaison",
        sens: "present_non_declare",
        gravite: "erreur",
        cible: r.nom,
        message: `« ${r.nom} » (${r.type}, vu dans : ${r.source}) existe dans la réalité et n'est déclarée nulle part dans ${sourceDeclaration}. Aucun code de ce dépôt ne peut la lire de façon typée.`,
      });
    }
  }

  return rapprocherEcarts(ecarts);
}
