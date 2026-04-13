"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createStore, updateStore } from "@/actions/admin/stores";
import type { Store } from "@/lib/db/types";

interface StoreFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store | null;
}

export function StoreFormSheet({
  open,
  onOpenChange,
  store,
}: StoreFormSheetProps) {
  const isEditing = store !== null;
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEditing
        ? await updateStore(store.id, formData)
        : await createStore(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Boutique mise à jour" : "Boutique créée"
        );
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Modifier la boutique" : "Nouvelle boutique"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Modifiez les informations de la boutique."
              : "Ajoutez une nouvelle boutique physique."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={store?.name ?? ""}
              placeholder="NETEREKA Cocody"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              name="address"
              defaultValue={store?.address ?? ""}
              placeholder="Cocody, Angré 8e tranche, Abidjan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps_url">URL Google Maps *</Label>
            <Input
              id="google_maps_url"
              name="google_maps_url"
              type="url"
              defaultValue={store?.google_maps_url ?? ""}
              placeholder="https://www.google.com/maps/place/..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={store?.phone ?? ""}
              placeholder="+225 07 00 00 00 00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={store?.email ?? ""}
              placeholder="contact@netereka.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening_hours">Horaires d&apos;ouverture</Label>
            <Input
              id="opening_hours"
              name="opening_hours"
              defaultValue={store?.opening_hours ?? ""}
              placeholder="Lun-Sam 9h-19h"
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="sort_order">Ordre d&apos;affichage</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                min={0}
                defaultValue={store?.sort_order ?? 0}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Enregistrement..."
                : isEditing
                  ? "Mettre à jour"
                  : "Créer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
