"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTeamProfile } from "@/actions/admin/profile";
import { JOB_TITLE_OPTIONS } from "@/lib/constants/team";
import { toast } from "sonner";

interface ProfileInfoFormProps {
  defaultValues: {
    firstName: string;
    lastName: string;
    phone: string;
    jobTitle: string;
  };
  email: string;
}

export function ProfileInfoForm({ defaultValues, email }: ProfileInfoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(defaultValues.firstName);
  const [lastName, setLastName] = useState(defaultValues.lastName);
  const [phone, setPhone] = useState(defaultValues.phone);
  const [jobTitle, setJobTitle] = useState(defaultValues.jobTitle);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTeamProfile({
        firstName,
        lastName,
        phone: phone || undefined,
        jobTitle: jobTitle || undefined,
      });
      if (result.success) {
        toast.success("Profil mis à jour");
      } else {
        toast.error(result.error ?? "Erreur lors de la mise à jour");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">
          L&apos;email ne peut pas être modifié
        </p>
      </div>

      {/* Name fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            minLength={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            minLength={1}
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+225 XX XX XX XX XX"
        />
      </div>

      {/* Job title */}
      <div className="space-y-1.5">
        <Label htmlFor="jobTitle">Poste</Label>
        <Select value={jobTitle || "_none"} onValueChange={(v) => setJobTitle(v === "_none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un poste" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Aucun</SelectItem>
            {JOB_TITLE_OPTIONS.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
            Enregistrement...
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </form>
  );
}
