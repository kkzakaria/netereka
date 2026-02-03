"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";
import { formatDateShort } from "@/lib/utils";
import { TEAM_ROLE_LABELS, TEAM_ROLE_VARIANTS } from "@/lib/constants/team";
import type { TeamMember } from "@/lib/db/types";

// Hoisted static icon
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={20} />;

interface TeamCardMobileProps {
  member: TeamMember;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

export function TeamCardMobile({ member }: TeamCardMobileProps) {
  const router = useRouter();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const roleKey = member.role as "admin" | "super_admin";

  const handleViewProfile = useCallback(() => {
    router.push(`/team/${member.id}`);
  }, [router, member.id]);

  const actions = useMemo<ActionSheetItem[]>(
    () => [{ label: "Voir profil", icon: ViewIcon, onClick: handleViewProfile }],
    [handleViewProfile]
  );

  const fullName = `${member.first_name} ${member.last_name}`;

  return (
    <>
      <Link
        href={`/team/${member.id}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 100px" }}
      >
        {/* Avatar */}
        <Avatar className="h-16 w-16 shrink-0">
          {member.avatar_url && <AvatarImage src={member.avatar_url} alt={fullName} />}
          <AvatarFallback className="text-lg">
            {getInitials(member.first_name, member.last_name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {/* Name + date */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{fullName}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDateShort(member.created_at)}
            </span>
          </div>

          {/* Email */}
          <div className="truncate text-sm text-muted-foreground">
            {member.email}
          </div>

          {/* Job title */}
          {member.job_title && (
            <div className="truncate text-xs text-muted-foreground">
              {member.job_title}
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge
              variant={TEAM_ROLE_VARIANTS[roleKey] || "secondary"}
              className="text-[10px]"
            >
              {TEAM_ROLE_LABELS[roleKey] || member.role}
            </Badge>
            {member.is_active === 1 ? (
              <Badge variant="outline" className="text-[10px] text-green-600">
                Actif
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">
                Inactif
              </Badge>
            )}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActionSheetOpen(true);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Plus d'options"
        >
          {moreIcon}
        </button>
      </Link>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={fullName}
        items={actions}
      />
    </>
  );
}
