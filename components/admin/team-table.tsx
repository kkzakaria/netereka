"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { formatDateShort } from "@/lib/utils";
import { TEAM_ROLE_LABELS, TEAM_ROLE_VARIANTS } from "@/lib/constants/team";
import type { TeamMember } from "@/lib/db/types";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

// Hoisted static icons
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={16} />;
const viewIcon = <HugeiconsIcon icon={ViewIcon} size={14} />;

const TeamRow = memo(function TeamRow({
  member,
}: {
  member: TeamMember;
}) {
  const roleKey = member.role as "admin" | "super_admin";

  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell>
        <Link
          href={`/team/${member.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar className="h-8 w-8">
            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={`${member.first_name} ${member.last_name}`} />}
            <AvatarFallback className="text-xs">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {member.first_name} {member.last_name}
          </span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {member.phone || "—"}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {member.job_title || "—"}
      </TableCell>
      <TableCell>
        <Badge variant={TEAM_ROLE_VARIANTS[roleKey] || "secondary"}>
          {TEAM_ROLE_LABELS[roleKey] || member.role}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {formatDateShort(member.created_at)}
      </TableCell>
      <TableCell className="text-center">
        {member.is_active === 1 ? (
          <Badge variant="outline" className="text-green-600">Actif</Badge>
        ) : (
          <Badge variant="destructive">Inactif</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              {moreIcon}
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/team/${member.id}`} className="gap-2">
                {viewIcon}
                Voir profil
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export const TeamTable = memo(function TeamTable({
  members,
}: {
  members: TeamMember[];
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucun membre trouvé
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Téléphone</TableHead>
            <TableHead className="hidden lg:table-cell">Poste</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="hidden lg:table-cell">Ajouté le</TableHead>
            <TableHead className="text-center">Statut</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TeamRow key={member.id} member={member} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
