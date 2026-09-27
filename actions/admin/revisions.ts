"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { applyRevision, rejectRevision, getRevision, RevisionError, type RevisionTarget } from "@/lib/db/revisions";
import type { ActionResult } from "@/lib/types/actions";

/**
 * Revalide la page storefront affectée par une révision appliquée. Une
 * bannière revalide aussi `/` — le hero vit sur la page d'accueil, pas
 * uniquement sur un écran d'administration.
 */
async function revalidateTarget(targetType: RevisionTarget, targetId: string): Promise<void> {
  if (targetType === "banner") {
    revalidatePath("/");
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

export async function applyRevisionAction(revisionId: string): Promise<ApplyRevisionResult> {
  const session = await requireAdmin();

  try {
    const { superseded } = await applyRevision(revisionId, { id: session.user.id, name: session.user.name });
    // Lue après l'application : la révision existe toujours (son statut
    // passe à "applied", elle n'est jamais supprimée), ce qui donne la cible
    // à revalider sans changer la signature d'applyRevision.
    const rev = await getRevision(revisionId);
    if (rev) await revalidateTarget(rev.target_type, rev.target_id);
    return { success: true, supersededCount: superseded };
  } catch (error) {
    if (error instanceof RevisionError) {
      return { success: false, error: error.message };
    }
    console.error("[admin/revisions] applyRevisionAction error:", error);
    return { success: false, error: "Erreur lors de l'application de la révision." };
  }
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
