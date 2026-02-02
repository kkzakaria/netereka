"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAddressAction, updateAddressAction } from "@/actions/addresses";
import type { Address } from "@/lib/db/types";
import { toast } from "sonner";

interface Props {
  address?: Address | null;
  onDone: () => void;
}

export function AddressForm({ address, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(address?.label ?? "");
  const [fullName, setFullName] = useState(address?.full_name ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [commune, setCommune] = useState(address?.commune ?? "");
  const [instructions, setInstructions] = useState(address?.instructions ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { label, fullName, phone, street, commune, instructions: instructions || undefined };

    startTransition(async () => {
      const result = address
        ? await updateAddressAction(address.id, data)
        : await createAddressAction(data);

      if (result.success) {
        toast.success(address ? "Adresse modifiée" : "Adresse ajoutée");
        onDone();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="addr-label">Libellé</Label>
        <Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Domicile, Bureau..." required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-name">Nom complet</Label>
        <Input id="addr-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-phone">Téléphone</Label>
        <Input id="addr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0701020304" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-street">Adresse</Label>
        <Input id="addr-street" value={street} onChange={(e) => setStreet(e.target.value)} required minLength={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-commune">Commune</Label>
        <Input id="addr-commune" value={commune} onChange={(e) => setCommune(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-instructions">Instructions (optionnel)</Label>
        <Textarea id="addr-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : address ? "Modifier" : "Ajouter"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
