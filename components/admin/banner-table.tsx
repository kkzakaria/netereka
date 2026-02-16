"use client";

import { memo, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils/images";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import {
  toggleBannerActive,
  deleteBanner,
} from "@/actions/admin/banners";

interface BannerRowData {
  id: number;
  title: string;
  image_url: string | null;
  display_order: number;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
}

function getBannerStatus(banner: BannerRowData): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  if (banner.is_active === 0) {
    return { label: "Inactive", variant: "secondary" };
  }

  const now = new Date().toISOString();

  if (banner.starts_at && banner.starts_at > now) {
    return {
      label: "Programmée",
      variant: "outline",
      className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    };
  }

  if (banner.ends_at && banner.ends_at <= now) {
    return { label: "Expirée", variant: "destructive" };
  }

  return {
    label: "Active",
    variant: "outline",
    className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "—";
  }
}

// Hoisted static elements (rendering-hoist-jsx)
const imagePlaceholder = <div className="h-10 w-10 rounded bg-muted" />;
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={18} />;

// Memoized row component for better performance (rerender-memo)
const BannerRow = memo(function BannerRow({
  banner,
  onToggleActive,
  onDelete,
}: {
  banner: BannerRowData;
  onToggleActive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const status = getBannerStatus(banner);

  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell>
        {banner.image_url ? (
          <Image
            src={getImageUrl(banner.image_url)}
            alt={banner.title}
            width={40}
            height={40}
            className="rounded object-cover"
          />
        ) : (
          imagePlaceholder
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/banners/${banner.id}/edit`}
          className="font-medium hover:underline"
        >
          {banner.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant} className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm font-mono">
        {banner.display_order}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
        {formatDate(banner.starts_at)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
        {formatDate(banner.ends_at)}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                {moreIcon}
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/banners/${banner.id}/edit`}>Modifier</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(banner.id)}
              >
                {banner.is_active === 1 ? "Désactiver" : "Activer"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  Supprimer
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette bannière ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement &quot;{banner.title}&quot;
                ainsi que son image associée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(banner.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
});

export function BannerTable({ banners }: { banners: BannerRowData[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = useCallback((id: number) => {
    startTransition(async () => {
      const result = await toggleBannerActive(id);
      if (!result.success) toast.error(result.error);
    });
  }, []);

  const handleDelete = useCallback((id: number) => {
    startTransition(async () => {
      const result = await deleteBanner(id);
      if (result.success) {
        toast.success("Bannière supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }, []);

  if (banners.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucune bannière créée
      </div>
    );
  }

  return (
    <div className="rounded-lg border touch-manipulation" data-pending={isPending || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden sm:table-cell">Ordre</TableHead>
            <TableHead className="hidden md:table-cell">Début</TableHead>
            <TableHead className="hidden md:table-cell">Fin</TableHead>
            <TableHead className="w-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banners.map((banner) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
