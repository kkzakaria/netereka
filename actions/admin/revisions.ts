"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { revalidateProductStorefront } from "@/lib/cache/revalidate-product";
import { refreshHeroPreload } from "@/lib/cloudflare/hero-preload";
import { applyRevision, rejectRevision, getRevision, RevisionError, type RevisionKind, type RevisionTarget } from "@/lib/db/revisions";
import type { ActionResult } from "@/lib/types/actions";

/**
 * Revalide les pages storefront affectées par une révision appliquée. Une
 * bannière revalide `/` (le hero vit sur la page d'accueil) ET re-sème le
 * préchargement LCP du hero (`hero:lcp:preload-url`), comme le font les sept
 * actions d'administration des bannières : sans cela, une bannière retirée ou
 * remplacée laisse le middleware précharger l'image de l'ancienne.
 *
 * Une publication, un retrait ou une remise en ligne touchent plus que la page
 * du produit : l'accueil et chaque page catégorie qui le liste (`revalidateProductStorefront`).
 */
async function revalidateTarget(targetType: RevisionTarget, targetId: string, kind: RevisionKind): Promise<void> {
  if (targetType === "banner") {
    revalidatePath("/");
    await refreshHeroPreload();
    return;
  }
  // Ces natures changent la visibilité de la fiche : accueil et catégories aussi.
  if (kind === "publish" || kind === "withdraw" || kind === "reactivate") {
    await revalidateProductStorefront(targetId);
    return;
  }
  try {
    const db = await getDrizzle();
    const row = await db.select({ slug: products.slug }).from(products).where(eq(products.id, targetId)).limit(1).get();
    if (row?.slug) revalidatePath(`/p/${row.slug}`);
  } catch (error) {
    console.error("[admin/revisions] revalidateTarget: lecture du slug échouée", { targetId }, error);
  }
}

/** § 2.5 du spec : « la ligne cible porte une version [...] et l'écran le
 *  dit ». `supersededCount` porte ce nombre jusqu'à `RevisionActions`, pour
 *  que remplacer discrètement N autres propositions sur la même fiche laisse
 *  une trace visible ailleurs que dans le journal d'audit. */
export interface ApplyRevisionResult extends ActionResult {
  supersededCount?: number;
}

/**
 * `confirmation` : la saisie d'un retrait (§ 2.6). Ignorée par toute autre
 * nature ; pour un `withdraw`, c'est `applyRevision` qui la vérifie et refuse.
 */
export async function applyRevisionAction(revisionId: string, confirmation?: string): Promise<ApplyRevisionResult> {
  const session = await requireAdmin();

  let superseded: number;
  try {
    ({ superseded } = await applyRevision(
      revisionId,
      { id: session.user.id, name: session.user.name },
      { confirmation },
    ));
  } catch (error) {
    if (error instanceof RevisionError) {
      return { success: false, error: error.message };
    }
    console.error("[admin/revisions] applyRevisionAction error:", error);
    return { success: false, error: "Erreur lors de l'application de la révision." };
  }

  // L'application a déjà réussi (le bloc ci-dessus ne serait pas atteint
  // sinon) : la revalidation est un meilleur effort, hors de cette portée
  // d'erreur exprès. Un échec ici ne doit JAMAIS retourner un échec à
  // l'appelant — sinon l'administrateur voit une erreur, réessaie, et le
  // second essai échoue en conflit (la révision est déjà `applied`) : il
  // conclut que quelque chose est cassé, alors que son contenu est en ligne
  // depuis le premier clic. `getRevision` est lue ici (pas dans le bloc
  // au-dessus) pour la même raison : elle donne la cible à revalider, mais
  // son échec ne doit pas non plus se faire passer pour un échec
  // d'application.
  try {
    const rev = await getRevision(revisionId);
    if (rev) await revalidateTarget(rev.target_type, rev.target_id, rev.kind);
  } catch (error) {
    console.error(
      "[admin/revisions] revalidation après application réussie : échec best-effort",
      { revisionId },
      error,
    );
  }

  return { success: true, supersededCount: superseded };
}

export async function rejectRevisionAction(revisionId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  try {
    // Rejeter ne touche jamais la cible : aucun revalidatePath n'est
    // nécessaire, la ligne publiée n'a pas changé.
    await rejectRevision(revisionId, { id: session.user.id, name: session.user.name });
    return { success: true };
  } catch (error) {
    if (error instanceof RevisionError) {
      return { success: false, error: error.message };
    }
    console.error("[admin/revisions] rejectRevisionAction error:", error);
    return { success: false, error: "Erreur lors du rejet de la révision." };
  }
}
