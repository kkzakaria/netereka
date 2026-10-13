/**
 * Le bandeau qui coiffe tout aperçu de révision.
 *
 * TROIS RÔLES, ET LE TROISIÈME EST UNE GARDE.
 *
 *  1. Il DIT à l'administrateur que ce qu'il regarde n'est pas en ligne. Sans
 *     lui, l'aperçu est indiscernable du vrai site — c'est tout son intérêt,
 *     et c'est aussi son danger.
 *  2. Il NOMME la révision. L'image part au modèle par l'outil MCP
 *     `apercu_revision` : qu'elle soit auto-identifiante évite de lui faire
 *     tenir ensemble une photo et un identifiant reçus séparément.
 *  3. Il porte `data-apercu-revision`, le seul élément de tout le site à le
 *     faire, et `apercu_revision` exige sa présence par `waitForSelector`.
 *
 * Le troisième rôle ferme un trou que rien d'autre ne fermait : si le
 * laissez-passer de capture est refusé, la page redirige vers la connexion,
 * Browser Run SUIT la redirection, et rend un JPEG parfaitement valide — de
 * la page de connexion, ou de l'accueil, qui affiche les bannières EN LIGNE.
 * Le modèle aurait approuvé sa révision en regardant la production. Avec ce
 * marqueur, l'élément n'apparaît jamais et Browser Run échoue sur son délai
 * d'attente d'élément (422) au lieu de rendre une image crédible et fausse.
 *
 * Il doit donc rester VISIBLE et de hauteur non nulle : une vérification de
 * visibilité côté navigateur rejette une boîte vide, et le marqueur ne serait
 * jamais satisfait.
 */
export function ApercuEntete({ revisionId, type }: { revisionId: string; type: string }) {
  return (
    <div
      data-apercu-revision={revisionId}
      className="bg-foreground px-4 py-2 text-center text-xs font-medium text-background"
    >
      Aperçu de révision {type} · {revisionId} — ceci n&apos;est pas en ligne
    </div>
  );
}
