"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PencilEdit01Icon,
  Delete02Icon,
  ViewIcon,
  ViewOffSlashIcon,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toggleStoreActive, deleteStore } from "@/actions/admin/stores";
import { StoreFormSheet } from "./store-form-sheet";
import type { Store } from "@/lib/db/types";

export function StoresPageClient({ stores }: { stores: Store[] }) {
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setEditingStore(null);
    setSheetOpen(true);
  }

  function handleEdit(store: Store) {
    setEditingStore(store);
    setSheetOpen(true);
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

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteStore(deleteId);
      if (result.success) {
        toast.success("Boutique supprimée");
      } else {
        toast.error(result.error ?? "Erreur");
      }
      setDeleteId(null);
    });
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
              <TableHead className="w-[120px]">Actions</TableHead>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleEdit(store)}
                      aria-label="Modifier"
                    >
                      <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleToggle(store.id)}
                      disabled={isPending}
                      aria-label={store.is_active ? "Désactiver" : "Activer"}
                    >
                      <HugeiconsIcon
                        icon={store.is_active ? ViewOffSlashIcon : ViewIcon}
                        size={16}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteId(store.id)}
                      aria-label="Supprimer"
                      className="text-destructive hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </Button>
                  </div>
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
          <div
            key={store.id}
            className="rounded-lg border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{store.name}</span>
              <Badge variant={store.is_active ? "default" : "secondary"}>
                {store.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{store.address}</p>
            {store.phone && (
              <p className="text-sm text-muted-foreground">{store.phone}</p>
            )}
            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleEdit(store)}
                aria-label="Modifier"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleToggle(store.id)}
                disabled={isPending}
                aria-label={store.is_active ? "Désactiver" : "Activer"}
              >
                <HugeiconsIcon
                  icon={store.is_active ? ViewOffSlashIcon : ViewIcon}
                  size={16}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setDeleteId(store.id)}
                aria-label="Supprimer"
                className="text-destructive hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Sheet for create/edit */}
      <StoreFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        store={editingStore}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
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
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
