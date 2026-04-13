"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PencilEdit01Icon,
  Delete02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ActionSheet, type ActionSheetItem } from "@/components/admin/action-sheet";
import { toggleStoreActive, deleteStore } from "@/actions/admin/stores";
import { StoreFormDialog } from "./store-form-dialog";
import type { Store } from "@/lib/db/types";

const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={18} />;

export function StoresPageClient({ stores }: { stores: Store[] }) {
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setEditingStore(null);
    setDialogOpen(true);
  }

  function handleEdit(store: Store) {
    setEditingStore(store);
    setDialogOpen(true);
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleStoreActive(id);
      if (result.success) {
        toast.success("Statut mis à jour");
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteStore(id);
      if (result.success) {
        toast.success("Boutique supprimée");
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  function getActions(store: Store): ActionSheetItem[] {
    return [
      {
        label: "Modifier",
        icon: PencilEdit01Icon,
        onClick: () => handleEdit(store),
      },
      {
        label: store.is_active ? "Désactiver" : "Activer",
        icon: store.is_active ? ViewOffSlashIcon : ViewIcon,
        onClick: () => handleToggle(store.id),
      },
      {
        label: "Supprimer",
        icon: Delete02Icon,
        onClick: () => handleDelete(store.id),
        destructive: true,
        requiresConfirm: true,
      },
    ];
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {stores.length} boutique(s)
        </p>
        <Button onClick={handleCreate}>Ajouter une boutique</Button>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucune boutique. Cliquez sur &quot;Ajouter une boutique&quot; pour commencer.
                </TableCell>
              </TableRow>
            )}
            {stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell className="font-medium">{store.name}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {store.address}
                </TableCell>
                <TableCell>{store.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={store.is_active ? "default" : "secondary"}>
                    {store.is_active ? "Actif" : "Inactif"}
                  </Badge>
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
                        <DropdownMenuItem onClick={() => handleEdit(store)}>
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(store.id)}>
                          {store.is_active ? "Désactiver" : "Activer"}
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
                        <AlertDialogTitle>Supprimer cette boutique ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. La boutique sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(store.id)}
                          disabled={isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {stores.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune boutique.
          </p>
        )}
        {stores.map((store) => (
          <StoreCardMobile
            key={store.id}
            store={store}
            actions={getActions(store)}
          />
        ))}
      </div>

      {/* Dialog for create/edit */}
      <StoreFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        store={editingStore}
      />
    </>
  );
}

function StoreCardMobile({
  store,
  actions,
}: {
  store: Store;
  actions: ActionSheetItem[];
}) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30">
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <span className="truncate text-sm font-medium">{store.name}</span>
          <span className="truncate text-xs text-muted-foreground">{store.address}</span>
          {store.phone && (
            <span className="text-xs text-muted-foreground">{store.phone}</span>
          )}
          <div className="mt-1">
            <Badge variant={store.is_active ? "default" : "secondary"} className="text-[10px]">
              {store.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </div>
        <button
          onClick={() => setActionSheetOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Actions"
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </button>
      </div>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={store.name}
        items={actions}
      />
    </>
  );
}
