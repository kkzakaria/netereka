import { getEnv } from "@/lib/cloudflare/context";

/**
 * Quelle version du Worker a répondu à CETTE requête.
 *
 * POURQUOI CET ENDPOINT EXISTE. Une surcharge de version
 * (`Cloudflare-Workers-Version-Overrides`) qui ne s'applique pas n'échoue
 * pas : elle est ignorée, et la requête repart selon les pourcentages du
 * canari. On reçoit un 200 parfaitement normal, rendu par une AUTRE version
 * que celle qu'on croit observer. Sans un endroit où lire la version SERVIE,
 * « observer une version précise » reste une espérance, pas une mesure — et ce
 * dépôt a déjà payé une fois pour avoir supposé quelle version tournait
 * (90 % du trafic sur une version vieille de deux jours, voir CLAUDE.md).
 *
 * CE QU'IL DIT, ET CE QU'IL TAIT. L'identifiant de version est un UUID
 * Cloudflare : il ne signifie rien pour qui n'a pas accès au compte, et c'est
 * exactement ce dont on a besoin pour confronter demandé et servi. L'étiquette
 * `workers/tag`, elle, porte le sha git du commit déployé — une empreinte de
 * build que cet endpoint public n'a aucune raison de distribuer. Qui a accès
 * au dépôt la retrouve par `wrangler versions list`, et
 * `scripts/observer-version.ts` fait justement cette jointure en local.
 *
 * PAS DE GARDE D'AUTHENTIFICATION, ET C'EST DÉLIBÉRÉ. On aurait pu n'ouvrir
 * qu'aux requêtes portant déjà l'en-tête de surcharge — mais rien ne dit que
 * Cloudflare transmette cet en-tête au Worker plutôt que de le consommer au
 * bord, et ce n'est vérifiable qu'une fois déployé. Bâtir la porte sur une
 * supposition invérifiable, c'est risquer un endpoint définitivement muet,
 * dont le silence ressemblerait à une absence de route. Une garde de session
 * aurait un autre défaut : elle ajouterait une lecture de base et un mode de
 * panne à ce qui doit rester la chose la plus simple de tout le Worker —
 * celle qu'on interroge précisément quand on ne sait plus ce qui tourne.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const env = await getEnv();
  const metadonnees = env.CF_VERSION_METADATA;

  // Dire ce qui manque plutôt que rendre `{ id: undefined }` : une réponse
  // 200 sans identifiant serait lue par `verifierVersionServie` comme une
  // surcharge non appliquée, et on chercherait le problème du mauvais côté.
  if (!metadonnees?.id) {
    return Response.json(
      { erreur: "La liaison CF_VERSION_METADATA est absente de cette version du Worker." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return Response.json(
    { id: metadonnees.id, depuis: metadonnees.timestamp },
    { headers: { "cache-control": "no-store" } },
  );
}
