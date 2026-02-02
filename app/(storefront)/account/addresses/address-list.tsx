"use client";

import { useState } from "react";
import type { Address } from "@/lib/db/types";
import { AddressCard } from "@/components/storefront/address-card";
import { AddressForm } from "@/components/storefront/address-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  function openCreate() {
    setEditingAddress(null);
    setDialogOpen(true);
  }

  function openEdit(address: Address) {
    setEditingAddress(address);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAddress(null);
  }

  return (
    <>
      <Button size="sm" onClick={openCreate}>
        Ajouter une adresse
      </Button>

      {addresses.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucune adresse enregistrée
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} address={addr} onEdit={openEdit} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Modifier l'adresse" : "Nouvelle adresse"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress ? "Modifiez les informations de cette adresse." : "Ajoutez une nouvelle adresse de livraison."}
            </DialogDescription>
          </DialogHeader>
          <AddressForm address={editingAddress} onDone={closeDialog} />
        </DialogContent>
      </Dialog>
    </>
  );
}
