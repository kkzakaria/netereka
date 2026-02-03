"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TEAM_ROLE_LABELS,
  TEAM_ROLE_VARIANTS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getEffectivePermissions,
  type TeamRole,
  type Permission,
} from "@/lib/permissions";

interface PermissionsDisplayProps {
  role: TeamRole;
  permissions: string | null;
}

// Hoisted static icons
const checkIcon = (
  <HugeiconsIcon
    icon={CheckmarkCircle01Icon}
    size={16}
    className="text-green-600"
  />
);
const crossIcon = (
  <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-muted-foreground" />
);
const shieldIcon = (
  <HugeiconsIcon icon={ShieldKeyIcon} size={16} className="text-muted-foreground" />
);

export function PermissionsDisplay({ role, permissions }: PermissionsDisplayProps) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  const isSuperAdmin = role === "super_admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {shieldIcon}
          Rôle et permissions
        </CardTitle>
        <CardDescription>
          Vos droits d&apos;accès dans l&apos;administration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current role */}
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Votre rôle</p>
          <Badge variant={TEAM_ROLE_VARIANTS[role]} className="text-sm">
            {TEAM_ROLE_LABELS[role]}
          </Badge>
        </div>

        {/* Super admin notice */}
        {isSuperAdmin && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            En tant que Super Admin, vous avez accès à toutes les fonctionnalités.
          </div>
        )}

        {/* Permission groups */}
        {!isSuperAdmin && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Vos permissions</p>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <h4 className="mb-2 text-sm font-medium">{group.label}</h4>
                <ul className="space-y-1.5">
                  {group.permissions.map((permission) => {
                    const hasPermission = effectivePermissions.includes(permission);
                    return (
                      <li
                        key={permission}
                        className="flex items-center gap-2 text-sm"
                      >
                        {hasPermission ? checkIcon : crossIcon}
                        <span
                          className={
                            hasPermission ? "" : "text-muted-foreground"
                          }
                        >
                          {PERMISSION_LABELS[permission as Permission]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Contact admin notice */}
        <p className="text-xs text-muted-foreground">
          Contactez un administrateur pour modifier vos permissions.
        </p>
      </CardContent>
    </Card>
  );
}
