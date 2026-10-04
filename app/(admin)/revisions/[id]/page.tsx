import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { REVISION_KIND_LABELS, getRevision, listPendingRevisions } from "@/lib/db/revisions";
import { getAdminProductById } from "@/lib/db/admin/products";
import { getBannerById } from "@/lib/db/admin/banners";
import { RevisionDiff } from "@/components/admin/revision-diff";
import { RevisionActions } from "@/components/admin/revision-actions";
import { getWithdrawImpact } from "@/lib/db/withdraw-impact";
import { getReactivationReadiness } from "@/lib/db/reactivation-readiness";
import { withdrawalReading } from "@/lib/revisions/withdraw-reading";
import { formatDateTime } from "@/lib/utils/format";

interface Props {
  params: Promise<{ id: string }>;
}

const TARGET_LABELS: Record<string, string> = {
  product: "Produit",
  banner: "Bannière",
};

const ORIGIN_LABELS: Record<string, string> = {
  mcp: "MCP",
  admin_chat: "Chat admin",
};

// Icône statique hissée hors du composant (rendering-hoist-jsx), comme
// app/(admin)/orders/[id]/page.tsx.
const backIcon = <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />;

/**
 * Détail d'une révision : la comparaison entre le rendu actuel de la cible et
 * le rendu proposé (§ 2.4 du spec), plus les actions Appliquer / Rejeter.
 *
 * Une révision déjà résolue (`applied`/`rejected`/`superseded`) reste
 * consultable ici — `getRevision` ne filtre pas sur le statut — mais
 * `RevisionActions` appelle les mêmes actions serveur que pour une révision
 * `pending` : une seconde tentative d'application échoue proprement sur un
 * conflit (`RevisionError("conflict")`), affiché tel quel plutôt que masqué.
 */
export default async function RevisionDetailPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const revision = await getRevision(id);
  if (!revision) notFound();

  const current =
    revision.target_type === "banner"
      ? await getBannerById(Number(revision.target_id))
      : await getAdminProductById(revision.target_id);

  // La cible a pu disparaître depuis le dépôt (produit supprimé, bannière
  // retirée) : la révision existe encore mais n'a plus rien à comparer.
  if (!current) notFound();

  // § 2.5 du spec : appliquer cette révision passera les autres révisions
  // `pending` de la même cible en `superseded` — « et l'écran le dit ». Ce
  // compte est affiché AVANT le clic (RevisionActions), pas seulement après.
  const siblingPending = await listPendingRevisions(revision.target_type, revision.target_id);
  const otherPendingCount = siblingPending.filter((r) => r.id !== revision.id).length;

  // § 2.6 : l'écran d'un retrait montre des conséquences MESURÉES, lues ici à
  // chaque affichage — jamais stockées dans la révision, qui les périmerait.
  const impact = revision.kind === "withdraw" ? await getWithdrawImpact(revision.target_type, revision.target_id) : null;
  // Sans mesure, le nom attendu est vide et ne se confirme jamais : le bouton
  // reste désactivé plutôt que de laisser appliquer sur un écran qui n'a rien montré.
  const withdrawal =
    revision.kind === "withdraw" ? { targetName: impact ? withdrawalReading(impact).confirmName : "" } : undefined;

  // § 2.6 bis : les constats d'une remise en ligne sont mesurés de la même façon, à chaque
  // affichage. Un produit seulement : `assertValidPayload` refuse `reactivate` sur une bannière.
  const readiness =
    revision.kind === "reactivate" && revision.target_type === "product"
      ? await getReactivationReadiness(revision.target_id)
      : null;

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux révisions"
          >
            <Link href="/revisions">{backIcon}</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {TARGET_LABELS[revision.target_type] ?? revision.target_type} #{revision.target_id}
            </h1>
            <p className="text-sm text-muted-foreground">
              {REVISION_KIND_LABELS[revision.kind] ?? revision.kind} — proposée par {revision.actor_name} (
              {ORIGIN_LABELS[revision.origin] ?? revision.origin}), {formatDateTime(revision.created_at)}
            </p>
          </div>
        </header>
        {revision.summary && (
          <p className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">{revision.summary}</p>
        )}
        {/* L'aperçu ne vaut que s'il est TROUVABLE depuis l'écran où la
            décision se prend. Il monte le vrai composant de la vitrine avec
            le contenu proposé : c'est la seule façon de voir une révision
            avant de l'appliquer — le diff montre des champs, pas un rendu.
            Nouvel onglet, pour ne pas perdre l'écran de validation. */}
        {revision.target_type === "banner" && (
          <p className="mt-3 text-sm">
            <Link
              href={`/apercu/banniere/${revision.id}`}
              target="_blank"
              rel="noopener"
              className="font-medium underline underline-offset-4"
            >
              Voir le rendu de cette révision dans le hero
            </Link>
            <span className="text-muted-foreground"> — rétrécissez la fenêtre pour juger du mobile.</span>
          </p>
        )}
      </AdminPageHeader>

      <RevisionDiff
        target={revision.target_type}
        kind={revision.kind}
        targetId={revision.target_id}
        current={current}
        payload={revision.payload}
        impact={impact}
        readiness={readiness}
      />

      <RevisionActions
        revisionId={revision.id}
        otherPendingCount={otherPendingCount}
        withdrawal={withdrawal}
        applyLabel={revision.kind === "reactivate" ? "Remettre en ligne" : undefined}
      />
    </div>
  );
}
