"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateLong } from "@/lib/utils";
import { ADMIN_ROLE_OPTIONS } from "@/lib/constants/customers";
import { updateCustomerRole } from "@/actions/admin/customers";
import type { AdminUser } from "@/lib/db/admin/users";
import type { UserRole } from "@/lib/db/types";

interface UserSidebarProps {
  user: AdminUser;
  isSuperAdmin: boolean;
}

export function UserSidebar({ user, isSuperAdmin }: UserSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(newRole: UserRole) {
    setError(null);
    startTransition(async () => {
      const result = await updateCustomerRole(user.id, newRole);
      if (!result.success) {
        setError(result.error || "Erreur lors du changement de rôle");
      } else {
        router.refresh();
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
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actions administrateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Role change - only for super_admin */}
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
                  {ADMIN_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
