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
 * laissez-passer de capture est refusé, la page redirige vers la connexion et
 * Browser Run suit la redirection : il rend alors un JPEG parfaitement valide,
 * non vide, CRÉDIBLE — celui de la page de connexion — que rien dans la taille
 * ni la forme ne distingue d'un aperçu. Avec ce marqueur, l'élément n'apparaît
 * jamais et Browser Run échoue sur son délai d'attente d'élément (422) au lieu
 * de rendre une image fausse.
 *
 * (Une relecture avait écrit « ou de l'accueil, qui affiche les bannières en
 * ligne ». Vérifié : non. `requireAdmin()` ne redirige vers `/` que si une
 * SESSION existe — bannie ou de mauvais rôle — et un capteur n'en a jamais.
 * La page de connexion suffit largement au problème.)
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
