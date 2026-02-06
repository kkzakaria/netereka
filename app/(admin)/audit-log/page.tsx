import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuditLogs, getAuditLogCount } from "@/lib/db/admin/audit-log";
import { AUDIT_ACTION_LABELS } from "@/lib/constants/audit";
import { formatDateShort } from "@/lib/utils";
import type { AuditAction } from "@/lib/db/types";
import { AuditLogFilters } from "./_components/audit-log-filters";

interface Props {
  searchParams: Promise<{
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 30;

function parseDetails(details: string | null): Record<string, string> | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function ActionDescription({
  action,
  details,
}: {
  action: AuditAction;
  details: string | null;
}) {
  const parsed = parseDetails(details);

  switch (action) {
    case "user.role_changed": {
      if (parsed?.fromLabel && parsed?.toLabel) {
        return (
          <span>
            {parsed.fromLabel} &rarr; {parsed.toLabel}
          </span>
        );
      }
      return <span>Rôle modifié</span>;
    }
    case "user.activated":
      return <span>Compte activé</span>;
    case "user.deactivated":
      return <span>Compte désactivé</span>;
    default:
      return <span>{action}</span>;
  }
}

const TARGET_TYPE_PATHS: Record<string, string> = {
  user: "/customers",
  product: "/products",
  order: "/orders",
  category: "/categories",
};

function getTargetHref(targetType: string, targetId: string): string {
  const basePath = TARGET_TYPE_PATHS[targetType] ?? "/customers";
  return `${basePath}/${targetId}`;
}

export default async function AuditLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const filterOpts = {
    action: params.action && params.action !== "all" ? params.action : undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const totalCount = await getAuditLogCount(filterOpts);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (requestedPage > totalPages && totalPages > 0) {
    const newParams = new URLSearchParams();
    if (params.action) newParams.set("action", params.action);
    if (params.dateFrom) newParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) newParams.set("dateTo", params.dateTo);
    newParams.set("page", String(totalPages));
    redirect(`/audit-log?${newParams.toString()}`);
  }

  const page = Math.min(requestedPage, totalPages);

  const logs = await getAuditLogs({
    ...filterOpts,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div>
      <AdminPageHeader className="space-y-4">
        <AdminHeader title="Journal d'audit" />
        <AuditLogFilters />
      </AdminPageHeader>

      {logs.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Aucune entrée trouvée
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Détails</TableHead>
                <TableHead className="hidden md:table-cell">Cible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateShort(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.actor_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    <ActionDescription
                      action={log.action}
                      details={log.details}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {log.target_id && (
                      <Link
                        href={getTargetHref(log.target_type, log.target_id)}
                        className="text-sm text-primary hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalCount} entrée(s) — Page {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/audit-log",
                    query: { ...params, page: String(page - 1) },
                  }}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/audit-log",
                    query: { ...params, page: String(page + 1) },
                  }}
                >
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
