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
import { ROLE_LABELS, ROLE_VARIANTS } from "@/lib/constants/customers";
import type { AdminUser } from "@/lib/db/admin/users";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={16} />;
const viewIcon = <HugeiconsIcon icon={ViewIcon} size={14} />;

const UserRow = memo(function UserRow({ user }: { user: AdminUser }) {
  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell>
        <Link
          href={`/users/${user.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar className="h-8 w-8">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {user.phone || "—"}
      </TableCell>
      <TableCell>
        <Badge variant={ROLE_VARIANTS[user.role] || "secondary"}>
          {ROLE_LABELS[user.role] || user.role}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {formatDateShort(user.createdAt)}
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
              <Link href={`/users/${user.id}`} className="gap-2">
                {viewIcon}
                Voir détails
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export const UserTable = memo(function UserTable({
  users,
}: {
  users: AdminUser[];
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucun utilisateur trouvé
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Téléphone</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="hidden lg:table-cell">Membre depuis</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
