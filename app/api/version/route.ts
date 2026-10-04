import { getEnv } from "@/lib/cloudflare/context";
import { estUuidDeVersion } from "@/lib/release/observation";

/**
 * « La version que je demande est-elle bien celle qui répond ? » — oui ou non.
 *
 * POURQUOI CET ENDPOINT EXISTE. Une surcharge de version
 * (`Cloudflare-Workers-Version-Overrides`) qui ne s'applique pas n'échoue
 * pas : elle est ignorée, et la requête repart selon les pourcentages du
 * canari. On reçoit un 200 parfaitement normal, rendu par une AUTRE version
 * que celle qu'on croit observer. Sans un endroit où confronter demandé et
 * servi, « observer une version précise » reste une espérance, pas une
 * mesure — et ce dépôt a déjà payé une fois pour avoir supposé quelle version
 * tournait (90 % du trafic sur une version vieille de deux jours).
 *
 * IL RÉPOND PAR UN BOOLÉEN, ET NE PUBLIE RIEN. La première version de cette
 * route rendait l'identifiant de la version servie. C'était confortable et
 * c'était une faute : cet identifiant EST le sésame de
 * `Cloudflare-Workers-Version-Overrides`. Le publier aurait fait passer
 * l'épinglage de version de « il faut un accès au compte Cloudflare pour
 * connaître cet UUID » à « n'importe qui peut le lire ». Concrètement,
 * pendant un canari, quelques requêtes auraient suffi à moissonner les deux
 * UUID vivants, puis à s'épingler sur la version de base — par exemple pour
 * continuer d'atteindre celle qu'un correctif de sécurité venait remplacer.
 *
 * Le paramètre `attendu` referme cela : l'appelant doit DÉJÀ connaître l'UUID
 * qu'il vérifie, et la réponse n'en ajoute aucun. Ce qui reste est un oracle
 * minuscule — confirmer qu'un UUID qu'on possède déjà sert en ce moment — là
 * où un UUID est de toute façon imprédictible.
 *
 * PAS DE GARDE D'AUTHENTIFICATION, ET C'EST DÉLIBÉRÉ. On aurait pu n'ouvrir
 * qu'aux requêtes portant déjà l'en-tête de surcharge, mais rien ne dit que
 * Cloudflare le transmette au Worker plutôt que de le consommer au bord, et
 * ce n'est vérifiable qu'une fois déployé : bâtir la porte sur une
 * supposition invérifiable, c'est risquer un endpoint définitivement muet
 * dont le silence ressemblerait à une absence de route. Une garde de session
 * aurait un autre défaut — une lecture de base et un mode de panne de plus
 * sur ce qui doit rester la chose la plus simple du Worker, celle qu'on
 * interroge précisément quand on ne sait plus ce qui tourne.
 */
export const dynamic = "force-dynamic";

const SANS_CACHE = { "cache-control": "no-store" } as const;

export async function GET(requete: Request) {
  const attendu = new URL(requete.url).searchParams.get("attendu");

  // On exige la forme complète ET en minuscules, la même que l'en-tête de
  // surcharge : un préfixe ou une majuscule sont acceptés par curl, ignorés
  // par Cloudflare, et rendraient ici un `conforme: false` qu'on imputerait
  // au canari plutôt qu'à sa propre saisie.
  if (!estUuidDeVersion(attendu)) {
    return Response.json(
      { erreur: "Paramètre `attendu` manquant ou mal formé : un UUID de version complet." },
      { status: 400, headers: SANS_CACHE },
    );
  }

  const metadonnees = (await getEnv()).CF_VERSION_METADATA;

  // Dire ce qui manque plutôt que rendre `conforme: false` : l'absence de
  // liaison se lirait comme une surcharge non appliquée, et on chercherait le
  // problème du mauvais côté.
  if (!metadonnees?.id) {
    return Response.json(
      { erreur: "La liaison CF_VERSION_METADATA est absente de cette version du Worker." },
      { status: 503, headers: SANS_CACHE },
    );
  }

  return Response.json(
    { conforme: metadonnees.id === attendu },
    { headers: SANS_CACHE },
  );
}
