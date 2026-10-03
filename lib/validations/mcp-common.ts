import { z } from "zod";

/** Motif d'un retrait : c'est le `summary` de la révision, la première chose
 *  que l'administrateur lit sous le titre de l'écran. Obligatoire : un retrait
 *  sans raison est celui qu'on ne peut pas juger. */
export const withdrawReasonSchema = z.string().trim().min(1).max(500);

/** Motif d'une MODIFICATION : même forme que le retrait, même emplacement (`summary`,
 *  sous le titre de l'écran). La règle : ce qui MODIFIE l'accepte sans l'exiger
 *  (`update_banner`, `update_product`) — exiger une ligne d'écran de deux outils déjà
 *  en service casserait leur contrat pour peu ; ce qui BASCULE LA VISIBILITÉ l'exige,
 *  parce qu'une telle décision sans raison ne se juge pas. Donc obligatoire aussi sur
 *  `reactivate_product` (`lib/mcp/tools/products.ts`), symétrique du retrait, et non
 *  « optionnel partout ». */
export const changeReasonSchema = withdrawReasonSchema;

/**
 * Un objet IMBRIQUÉ qui refuse les champs qu'il ne déclare pas, en les nommant.
 *
 * `lib/mcp/server.ts` rend stricte la RACINE des vingt outils. Sans ceci, le
 * silence qu'il ferme survivait un cran plus bas : une relecture a mesuré, par
 * un vrai client, que `pricing: { basePrice: 35000 }` rendait un succès et
 * écrivait `pricing: {}` — exactement l'incident du 2026-10-02, déplacé.
 *
 * Pire, le correctif de la racine y POUSSAIT l'appelant : son message répond
 * « n'accepte que : …, pricing, … », donc l'assistant corrige `base_price` en
 * `pricing: { … }` et, s'il se trompe à l'intérieur, retombe sur un succès pour
 * une écriture vide — avec cette fois la conviction d'avoir le bon conteneur.
 *
 * Le message nomme les champs de CE niveau, parce qu'un refus qui ne dit pas
 * quoi employer ne fait que déplacer les essais à l'aveugle.
 */
export function objetStrict<T extends z.ZodRawShape>(shape: T, chemin: string) {
  const champs = Object.keys(shape).sort().join(", ");
  return z.strictObject(shape, {
    // Une FONCTION, pas une chaîne : une chaîne s'applique à TOUTES les issues
    // de l'objet, `invalid_type` comprise. À la racine c'était inatteignable —
    // le SDK refuse un `arguments` non-objet avant d'arriver au schéma — mais
    // les objets imbriqués ne sont gardés par personne. Mesuré : `pricing: 35000`
    // répondait « Champ inconnu dans « pricing » » alors qu'aucun champ inconnu
    // n'avait été envoyé, sur neuf chemins.
    //
    // Et c'est précisément l'erreur que le refus de la racine rend probable :
    // son message nomme `pricing` sans dire que c'est un OBJET. L'appelant écrit
    // donc `pricing: 35000` et part chercher une clé fautive qui n'existe pas —
    // la boucle d'essais à l'aveugle que cette PR existe pour fermer,
    // reconstituée un cran plus bas.
    //
    // `undefined` retombe sur le message par défaut de Zod, qui dit la vraie
    // cause : « expected object, received number ».
    error: (iss) =>
      iss.code === "unrecognized_keys"
        ? `Champ inconnu dans « ${chemin} ». Cet objet n'accepte que : ${champs}.`
        : undefined,
  });
}
