"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAdminUser } from "@/actions/admin/users";
import { STAFF_ROLE_OPTIONS } from "@/lib/constants/customers";
import type { StaffRole } from "@/lib/db/types";

type Role = StaffRole;

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface FieldErrors {
  name?: string[];
  email?: string[];
  password?: string[];
  role?: string[];
}

const DEFAULT_VALUES: FormValues = {
  name: "",
  email: "",
  password: "",
  role: "agent",
};

export function CreateAdminUserDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setValues(DEFAULT_VALUES);
      setFieldErrors({});
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await createAdminUser(values);
        if (!result.success) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors as FieldErrors);
          } else {
            toast.error(result.error ?? "Erreur lors de la création");
          }
          return;
        }
        toast.success("Compte créé avec succès");
        handleOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Une erreur inattendue s'est produite");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Nouvel administrateur</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un compte administrateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nom</Label>
            <Input
              id="admin-name"
              placeholder="Jean Dupont"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
            {fieldErrors.name?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="jean@netereka.ci"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            {fieldErrors.email?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="admin-password">Mot de passe temporaire</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
            {fieldErrors.password?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="admin-role">Rôle</Label>
            <Select
              value={values.role}
              onValueChange={(value) => setValues((v) => ({ ...v, role: value as Role }))}
            >
              <SelectTrigger id="admin-role">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.role?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.role[0]}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
