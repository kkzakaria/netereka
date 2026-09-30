/**
 * Confirmation d'un retrait (§ 2.6 du spec) : une saisie, pas un clic.
 *
 * Module SANS import serveur : `RevisionActions` (composant client) s'en sert
 * pour activer le bouton, et `applyRevision` (lib/db/revisions.ts) s'en sert
 * pour REFUSER l'application. La décision est la même fonction des deux côtés,
 * et la garantie ne dépend pas du composant : un appelant qui n'afficherait
 * aucun champ de saisie (la surface conversationnelle, un script) est refusé
 * à l'application, pas seulement privé d'un bouton.
 *
 * Ce qu'il faut saisir est le NOM de la cible (nom du produit, titre de la
 * bannière), pas un mot fixe : « RETIRER » se tape par réflexe, le nom oblige
 * à avoir lu de quoi il s'agit.
 */

/** Normalise pour comparer : Unicode composé, espaces repliés, casse ignorée. */
export function normalizeConfirmation(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
}

/**
 * Vrai seulement si `typed` est le nom de la cible. Un nom de cible vide ne se
 * confirme jamais : sinon une saisie vide « correspondrait ».
 */
export function isWithdrawalConfirmed(typed: string | null | undefined, targetName: string): boolean {
  const expected = normalizeConfirmation(targetName);
  if (expected === "") return false;
  return typeof typed === "string" && normalizeConfirmation(typed) === expected;
}
