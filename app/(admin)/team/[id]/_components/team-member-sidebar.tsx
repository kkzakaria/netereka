"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Activity01Icon,
  CheckmarkBadge01Icon,
  Loading03Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDateLong } from "@/lib/utils";
import {
  TEAM_ROLE_LABELS,
  TEAM_ROLE_OPTIONS,
  type TeamRole,
} from "@/lib/permissions";
import {
  updateTeamMemberRole,
  toggleTeamMemberActive,
  deleteTeamMember,
} from "@/actions/admin/team";
import type { TeamMemberDetail } from "@/lib/db/types";

interface TeamMemberSidebarProps {
  member: TeamMemberDetail;
  isSuperAdmin: boolean;
  isOwnProfile: boolean;
}

// Hoisted static icons
const calendarIcon = <HugeiconsIcon icon={Calendar03Icon} size={16} className="text-muted-foreground" />;
const activityIcon = <HugeiconsIcon icon={Activity01Icon} size={16} className="text-muted-foreground" />;
const ordersIcon = <HugeiconsIcon icon={CheckmarkBadge01Icon} size={16} className="text-muted-foreground" />;
const loadingIcon = <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />;
const deleteIcon = <HugeiconsIcon icon={Delete02Icon} size={16} />;

export function TeamMemberSidebar({
  member,
  isSuperAdmin,
  isOwnProfile,
}: TeamMemberSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(newRole: TeamRole) {
    setError(null);
    startTransition(async () => {
      const result = await updateTeamMemberRole(member.id, newRole);
      if (!result.success) {
        setError(result.error || "Erreur lors du changement de rôle");
      }
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await toggleTeamMemberActive(member.id);
      if (!result.success) {
        setError(result.error || "Erreur lors du changement de statut");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTeamMember(member.id);
      if (result.success) {
        router.push("/team");
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    });
  }

  const roleKey = member.role as TeamRole;

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Joined date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {calendarIcon}
              <span className="text-sm text-muted-foreground">Membre depuis</span>
            </div>
            <span className="text-sm font-medium">
              {formatDateLong(member.created_at)}
            </span>
          </div>

          {/* Orders handled */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ordersIcon}
              <span className="text-sm text-muted-foreground">Commandes traitées</span>
            </div>
            <Badge variant="outline">{member.orders_handled}</Badge>
          </div>

          {/* Last activity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activityIcon}
              <span className="text-sm text-muted-foreground">Dernière activité</span>
            </div>
            <span className="text-sm font-medium">
              {member.last_activity
                ? formatDateLong(member.last_activity)
                : "Aucune"}
            </span>
          </div>

          {/* Last login */}
          {member.last_login_at && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activityIcon}
                <span className="text-sm text-muted-foreground">Dernière connexion</span>
              </div>
              <span className="text-sm font-medium">
                {formatDateLong(member.last_login_at)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      {isSuperAdmin && !isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
            <CardDescription>Gérer ce membre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <Select
                value={roleKey}
                onValueChange={handleRoleChange}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue>
                    {TEAM_ROLE_LABELS[roleKey] || member.role}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle active */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleToggleActive}
              disabled={isPending}
            >
              {isPending ? loadingIcon : null}
              {member.is_active === 1 ? "Désactiver le compte" : "Activer le compte"}
            </Button>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={isPending}
                >
                  {deleteIcon}
                  Supprimer le membre
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le compte de{" "}
                    <strong>
                      {member.first_name} {member.last_name}
                    </strong>{" "}
                    sera définitivement supprimé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending ? loadingIcon : null}
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Own profile notice */}
      {isOwnProfile && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Vous ne pouvez pas modifier votre propre compte depuis cette page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
