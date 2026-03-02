"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Package02Icon,
  FolderLibraryIcon,
  Image02Icon,
  ShoppingBag01Icon,
  UserGroup02Icon,
  UserSettings01Icon,
  Audit01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useAdminUser } from "./admin-user-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, minRole: "agent" as const },
  { href: "/orders", label: "Commandes", icon: ShoppingBag01Icon, minRole: "agent" as const },
  { href: "/customers", label: "Clients", icon: UserGroup02Icon, minRole: "agent" as const },
  { href: "/products", label: "Produits", icon: Package02Icon, minRole: "admin" as const },
  { href: "/categories", label: "Catégories", icon: FolderLibraryIcon, minRole: "admin" as const },
  { href: "/banners", label: "Bannières", icon: Image02Icon, minRole: "admin" as const },
  { href: "/users", label: "Utilisateurs", icon: UserSettings01Icon, minRole: "admin" as const },
  { href: "/audit-log", label: "Journal d'audit", icon: Audit01Icon, minRole: "admin" as const },
];

const ROLE_RANK = { agent: 0, admin: 1, super_admin: 2 } as const;

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAdminUser();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1 p-4">
        <div className="mb-6 px-3">
          <Image
            src="/logo.png"
            alt="NETEREKA"
            width={120}
            height={43}
            className="h-8 w-auto"
          />
          <p className="mt-1 text-xs text-muted-foreground">Administration</p>
        </div>
        {navItems
          .filter((item) => ROLE_RANK[role] >= ROLE_RANK[item.minRole])
          .map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <HugeiconsIcon icon={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="mt-auto">
        <SidebarUserMenu />
      </div>
    </div>
  );
}
