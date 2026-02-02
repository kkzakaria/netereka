"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/account";
import { toast } from "sonner";

interface Props {
  defaultValues: { name: string; phone: string };
  email: string;
}

export function ProfileForm({ defaultValues, email }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(defaultValues.name);
  const [phone, setPhone] = useState(defaultValues.phone);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name, phone });
      if (result.success) {
        toast.success("Profil mis à jour");
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled className="bg-muted" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom complet</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="0701020304"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
