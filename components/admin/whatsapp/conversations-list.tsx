"use client";

import { memo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInstantFilters } from "@/hooks/use-instant-filters";
import type { ConversationListItem } from "@/actions/admin/whatsapp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWaPhone(phone: string): string {
  // +2250708XXXXXX → +225 07 XX XX XX XX
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+225") && cleaned.length === 13) {
    const local = cleaned.slice(4); // 9 digits
    return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  return phone;
}

function truncate(text: string | null, maxLen = 50): string {
  if (!text) return "—";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ConversationListItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Actif",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  escalated: {
    label: "Escaladé",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
  closed: {
    label: "Fermée",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
};

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "escalated", label: "Escaladé" },
  { value: "closed", label: "Fermée" },
];

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

const ConversationRow = memo(function ConversationRow({
  conv,
}: {
  conv: ConversationListItem;
}) {
  const statusCfg = STATUS_CONFIG[conv.status];
  const displayName = conv.user_name ?? formatWaPhone(conv.wa_phone);

  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 52px" }}
      className="transition-colors hover:bg-muted/50"
    >
      {/* Client */}
      <TableCell>
        <Link
          href={`/whatsapp/conversations/${conv.id}`}
          className="block focus:outline-none focus-visible:underline"
        >
          <span className="font-medium">{displayName}</span>
          {conv.user_name && (
            <span className="block text-[10px] text-muted-foreground">
              {formatWaPhone(conv.wa_phone)}
            </span>
          )}
          {conv.user_email && (
            <span className="block text-[10px] text-muted-foreground truncate max-w-[160px]">
              {conv.user_email}
            </span>
          )}
        </Link>
      </TableCell>

      {/* Last message */}
      <TableCell className="hidden md:table-cell max-w-xs">
        <span className="text-sm text-muted-foreground">
          {truncate(conv.last_message)}
        </span>
        {conv.last_message_at && (
          <span className="block text-[10px] text-muted-foreground mt-0.5">
            {relativeTime(conv.last_message_at)}
          </span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          className={statusCfg.className}
          style={{ borderWidth: 1, borderStyle: "solid" }}
        >
          {statusCfg.label}
        </Badge>
      </TableCell>

      {/* Linked */}
      <TableCell className="hidden sm:table-cell">
        <Badge variant={conv.user_id ? "default" : "outline"}>
          {conv.user_id ? "Oui" : "Non"}
        </Badge>
      </TableCell>

      {/* Message count */}
      <TableCell className="hidden sm:table-cell text-center">
        <Badge variant="secondary">{conv.message_count}</Badge>
      </TableCell>

      {/* Arrow link */}
      <TableCell className="text-right">
        <Link
          href={`/whatsapp/conversations/${conv.id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          Voir →
        </Link>
      </TableCell>
    </TableRow>
  );
});

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

const ConversationsTable = memo(function ConversationsTable({
  conversations,
}: {
  conversations: ConversationListItem[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucune conversation trouvée
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Dernier message</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden sm:table-cell">Lié</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Messages</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conv) => (
            <ConversationRow key={conv.id} conv={conv} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function ConversationsFilters() {
  const {
    isPending,
    updateFilters,
    clearFilters,
    getFilter,
    searchValue,
    handleSearchChange,
    clearSearch,
  } = useInstantFilters({ basePath: "/whatsapp/conversations" });

  const hasActiveFilters = searchValue || getFilter("status");

  return (
    <div data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wa-search" className="text-xs text-muted-foreground">
            Recherche
          </Label>
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="wa-search"
              placeholder="Téléphone, nom, email..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 sm:w-56"
            />
            {searchValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Statut</Label>
          <Select
            value={getFilter("status") || "all"}
            onValueChange={(value) => updateFilters({ status: value })}
          >
            <SelectTrigger className="min-w-40">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
            Tout effacer
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

interface ConversationsListProps {
  conversations: ConversationListItem[];
  currentSearch?: string;
  currentStatus?: string;
}

export function ConversationsList({
  conversations,
}: ConversationsListProps) {
  return (
    <div className="space-y-4">
      <ConversationsFilters />
      <ConversationsTable conversations={conversations} />
    </div>
  );
}
