"use client";

import { useState, useCallback, useTransition, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { MoreVerticalIcon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import {
  toggleBannerActive,
  deleteBanner,
  reorderBanners,
} from "@/actions/admin/banners";
import type { Banner } from "@/lib/db/types";

type BannerRowData = Pick<Banner, "id" | "title" | "image_url" | "display_order" | "is_active" | "starts_at" | "ends_at">;

function getBannerStatus(banner: BannerRowData): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  if (banner.is_active === 0) {
    return { label: "Inactive", variant: "secondary" };
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

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
    return "Date invalide";
  }
}

// Hoisted static elements
const imagePlaceholder = <div className="h-10 w-10 rounded bg-muted" />;
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={18} />;
const dragIcon = <HugeiconsIcon icon={DragDropVerticalIcon} size={18} />;

// Sortable row with drag handle
const SortableBannerRow = memo(function SortableBannerRow({
  banner,
  onToggleActive,
  onDelete,
}: {
  banner: BannerRowData;
  onToggleActive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const status = getBannerStatus(banner);

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell className="w-10 px-2">
        <button
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
          aria-label="Réorganiser"
        >
          {dragIcon}
        </button>
      </TableCell>
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
              <DropdownMenuItem onClick={() => onToggleActive(banner.id)}>
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

// Lightweight overlay shown while dragging (renders outside the table in a portal)
function DragOverlayRow({ banner }: { banner: BannerRowData }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-xl">
      <HugeiconsIcon icon={DragDropVerticalIcon} size={18} className="shrink-0 text-muted-foreground" />
      {banner.image_url ? (
        <Image
          src={getImageUrl(banner.image_url)}
          alt={banner.title}
          width={32}
          height={32}
          className="rounded object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted" />
      )}
      <span className="font-medium">{banner.title}</span>
    </div>
  );
}

export function BannerTable({ banners: initialBanners }: { banners: BannerRowData[] }) {
  const [items, setItems] = useState(initialBanners);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const previousItems = items;
    const oldIndex = items.findIndex((b) => b.id === active.id);
    const newIndex = items.findIndex((b) => b.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      display_order: idx,
    }));

    setItems(newItems);

    const newOrder = newItems.map((b) => b.id);
    startTransition(async () => {
      try {
        const result = await reorderBanners(newOrder);
        if (!result.success) {
          setItems(previousItems);
          toast.error(result.error || "Erreur lors de la sauvegarde de l'ordre");
        } else {
          toast.success("Ordre sauvegardé");
        }
      } catch (error) {
        console.error("[BannerTable] reorderBanners failed:", error);
        setItems(previousItems);
        toast.error("Erreur de connexion au serveur");
      }
    });
  }, [items]);

  const handleToggleActive = useCallback((id: number) => {
    startTransition(async () => {
      try {
        const result = await toggleBannerActive(id);
        if (result.success) {
          setItems((prev) =>
            prev.map((b) => (b.id === id ? { ...b, is_active: b.is_active === 1 ? 0 : 1 } : b))
          );
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch (error) {
        console.error("[BannerTable] toggleBannerActive failed:", error);
        toast.error("Erreur de connexion au serveur");
      }
    });
  }, []);

  const handleDelete = useCallback((id: number) => {
    startTransition(async () => {
      try {
        const result = await deleteBanner(id);
        if (result.success) {
          setItems((prev) => prev.filter((b) => b.id !== id));
          toast.success("Bannière supprimée");
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch (error) {
        console.error("[BannerTable] deleteBanner failed:", error);
        toast.error("Erreur de connexion au serveur");
      }
    });
  }, []);

  const activeItem = activeId !== null ? items.find((b) => b.id === activeId) ?? null : null;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucune bannière créée
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-lg border touch-manipulation" data-pending={isPending || undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
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
            <SortableContext
              items={items.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((banner) => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </div>
      <DragOverlay>
        {activeItem ? <DragOverlayRow banner={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
