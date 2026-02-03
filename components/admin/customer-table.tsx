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
import { formatPrice } from "@/lib/utils";
import type { AdminCustomer } from "@/lib/db/types";

const ROLE_LABELS: Record<string, string> = {
  customer: "Client",
  admin: "Admin",
  super_admin: "Super Admin",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  customer: "secondary",
  admin: "default",
  super_admin: "destructive",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Hoisted static icons
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={16} />;
const viewIcon = <HugeiconsIcon icon={ViewIcon} size={14} />;

const CustomerRow = memo(function CustomerRow({
  customer,
}: {
  customer: AdminCustomer;
}) {
  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell>
        <Link
          href={`/customers/${customer.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar className="h-8 w-8">
            {customer.image && <AvatarImage src={customer.image} alt={customer.name} />}
            <AvatarFallback className="text-xs">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{customer.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{customer.email}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {customer.phone || "—"}
      </TableCell>
      <TableCell>
        <Badge variant={ROLE_VARIANTS[customer.role] || "secondary"}>
          {ROLE_LABELS[customer.role] || customer.role}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {formatDate(customer.createdAt)}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-center">
        <Badge variant="outline">{customer.order_count}</Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell font-mono">
        {formatPrice(customer.total_spent)}
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
              <Link href={`/customers/${customer.id}`} className="gap-2">
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

export const CustomerTable = memo(function CustomerTable({
  customers,
}: {
  customers: AdminCustomer[];
}) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucun client trouvé
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Téléphone</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="hidden lg:table-cell">Membre depuis</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Commandes</TableHead>
            <TableHead className="hidden sm:table-cell">Total dépensé</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
