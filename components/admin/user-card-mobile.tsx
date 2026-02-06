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
import { ROLE_LABELS, ROLE_VARIANTS } from "@/lib/constants/customers";
import type { AdminUser } from "@/lib/db/admin/users";

const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={20} />;

interface UserCardMobileProps {
  user: AdminUser;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserCardMobile({ user }: UserCardMobileProps) {
  const router = useRouter();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const handleViewDetails = useCallback(() => {
    router.push(`/users/${user.id}`);
  }, [router, user.id]);

  const actions = useMemo<ActionSheetItem[]>(
    () => [{ label: "Voir détails", icon: ViewIcon, onClick: handleViewDetails }],
    [handleViewDetails]
  );

  return (
    <>
      <Link
        href={`/users/${user.id}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30 active:bg-muted/50 touch-manipulation"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 88px" }}
      >
        {/* Avatar */}
        <Avatar className="h-16 w-16 shrink-0">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {/* Name + date */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{user.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDateShort(user.createdAt)}
            </span>
          </div>

          {/* Email */}
          <div className="truncate text-sm text-muted-foreground">
            {user.email}
          </div>

          {/* Phone */}
          {user.phone && (
            <div className="truncate text-xs text-muted-foreground">
              {user.phone}
            </div>
          )}

          {/* Role badge */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge
              variant={ROLE_VARIANTS[user.role] || "secondary"}
              className="text-[10px]"
            >
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
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
        title={user.name}
        items={actions}
      />
    </>
  );
}
