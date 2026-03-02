"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateLong } from "@/lib/utils";
import { STAFF_ROLE_OPTIONS } from "@/lib/constants/customers";
import { updateUserRole, banCustomer, unbanCustomer } from "@/actions/admin/customers";
import type { AdminUser } from "@/lib/db/admin/users";
import type { UserRole, StaffRole } from "@/lib/db/types";

interface UserSidebarProps {
  user: AdminUser;
  isSuperAdmin: boolean;
}

export function UserSidebar({ user, isSuperAdmin }: UserSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roleError, setRoleError] = useState<string | null>(null);

  async function handleRoleChange(newRole: UserRole) {
    setRoleError(null);
    startTransition(async () => {
      try {
        const result = await updateUserRole(user.id, newRole as StaffRole);
        if (!result.success) {
          setRoleError(result.error || "Erreur lors du changement de rôle");
        } else {
          toast.success("Rôle mis à jour avec succès");
          router.refresh();
        }
      } catch {
        setRoleError("Une erreur inattendue s'est produite");
      }
    });
  }

  function handleBan() {
    startTransition(async () => {
      try {
        const result = await banCustomer(user.id);
        if (!result.success) {
          toast.error(result.error || "Erreur lors du bannissement de l'utilisateur");
        } else {
          toast.success("Utilisateur banni avec succès");
          router.refresh();
        }
      } catch {
        toast.error("Une erreur inattendue s'est produite");
      }
    });
  }

  function handleUnban() {
    startTransition(async () => {
      try {
        const result = await unbanCustomer(user.id);
        if (!result.success) {
          toast.error(result.error || "Erreur lors du débannissement de l'utilisateur");
        } else {
          toast.success("Utilisateur débanni avec succès");
          router.refresh();
        }
      } catch {
        toast.error("Une erreur inattendue s'est produite");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Membre depuis</span>
            <span className="text-sm">{formatDateLong(user.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions administrateur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roleError && (
            <p className="text-sm text-destructive">{roleError}</p>
          )}

          {/* Role change - only for super_admin */}
          {isSuperAdmin && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Changer le rôle
              </label>
              <Select
                value={user.role}
                onValueChange={(value) => handleRoleChange(value as UserRole)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ban / Unban */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Statut du compte
            </label>
            {user.banned !== 1 ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleBan}
                disabled={isPending}
              >
                {isPending ? "Mise à jour..." : "Bannir"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUnban}
                  disabled={isPending}
                >
                  {isPending ? "Mise à jour..." : "Débannir"}
                </Button>
                {user.banReason && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Raison : {user.banReason}
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
