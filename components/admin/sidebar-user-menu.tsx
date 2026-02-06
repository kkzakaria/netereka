"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingBag01Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminUser } from "./admin-user-context";
import { authClient } from "@/lib/auth/client";

export function SidebarUserMenu() {
  const user = useAdminUser();
  const router = useRouter();

  const initials = (user.name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu utilisateur"
          >
            <Avatar size="default">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{user.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/">
              <HugeiconsIcon icon={ShoppingBag01Icon} size={16} />
              Voir la boutique
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await authClient.signOut();
              router.refresh();
            }}
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
