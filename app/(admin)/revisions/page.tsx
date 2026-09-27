import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPendingRevisions } from "@/lib/db/revisions";
import { formatDateTime } from "@/lib/utils/format";

const TARGET_LABELS: Record<string, string> = {
  product: "Produit",
  banner: "Bannière",
};

const ORIGIN_LABELS: Record<string, string> = {
  mcp: "MCP",
  admin_chat: "Chat admin",
};

const KIND_LABELS: Record<string, string> = {
  update: "Modification",
  publish: "Publication",
};

/**
 * Liste des révisions `content_revisions` en attente de validation.
 *
 * Sans cet écran, les tâches 2 et 3 (dépôt et application des révisions)
 * sont inatteignables : c'est ce qui rend le lot 1 livrable seul — un
 * administrateur peut faire relire ses fiches publiées par un modèle depuis
 * Claude Desktop, et appliquer ce qui lui convient (§ 8 du spec).
 */
export default async function RevisionsPage() {
  await requireAdmin();

  const revisions = await listPendingRevisions();

  return (
    <div>
      <AdminPageHeader className="space-y-1">
        <AdminHeader title="Révisions" />
        <p className="text-sm text-muted-foreground">
          {revisions.length} révision(s) en attente de validation
        </p>
      </AdminPageHeader>

      {revisions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune révision en attente.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cible</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Résumé</TableHead>
                <TableHead>Déposée le</TableHead>
                <TableHead className="sr-only">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((rev) => (
                <TableRow key={rev.id}>
                  <TableCell>
                    <Link
                      href={`/revisions/${rev.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {TARGET_LABELS[rev.target_type] ?? rev.target_type} #{rev.target_id}
                    </Link>
                    <div className="mt-1">
                      <Badge variant="outline">{KIND_LABELS[rev.kind] ?? rev.kind}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{ORIGIN_LABELS[rev.origin] ?? rev.origin}</TableCell>
                  <TableCell>{rev.actor_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{rev.summary ?? "—"}</TableCell>
                  <TableCell>{formatDateTime(rev.created_at)}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/revisions/${rev.id}`}>Examiner</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
