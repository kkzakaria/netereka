"use client";

import { useTransition, useState } from "react";
import type { Address } from "@/lib/db/types";
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
import { deleteAddressAction, setDefaultAddressAction } from "@/actions/addresses";
import { toast } from "sonner";

interface Props {
  address: Address;
  onEdit: (address: Address) => void;
}

export function AddressCard({ address, onEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      if (result.success) {
        toast.success("Adresse supprimée");
        setDeleteOpen(false);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  function handleSetDefault() {
    startTransition(async () => {
      const result = await setDefaultAddressAction(address.id);
      if (result.success) toast.success("Adresse par défaut mise à jour");
      else toast.error(result.error ?? "Erreur");
    });
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{address.label}</p>
            {address.is_default === 1 && <Badge variant="secondary">Par défaut</Badge>}
          </div>
          <p className="text-sm">{address.full_name}</p>
          <p className="text-xs text-muted-foreground">{address.street}</p>
          <p className="text-xs text-muted-foreground">{address.commune}, {address.city}</p>
          <p className="text-xs text-muted-foreground">{address.phone}</p>
          {address.instructions && (
            <p className="text-xs text-muted-foreground italic">{address.instructions}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="xs" onClick={() => onEdit(address)} disabled={pending}>
          Modifier
        </Button>
        {address.is_default !== 1 && (
          <Button variant="outline" size="xs" onClick={handleSetDefault} disabled={pending}>
            Par défaut
          </Button>
        )}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="xs" disabled={pending} className="text-destructive">
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette adresse ?</AlertDialogTitle>
              <AlertDialogDescription>
                L&apos;adresse &quot;{address.label}&quot; sera définitivement supprimée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm">Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
                {pending ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
