"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Package02Icon,
  FolderLibraryIcon,
  ShoppingBag01Icon,
  UserGroup02Icon,
  Audit01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/products", label: "Produits", icon: Package02Icon },
  { href: "/categories", label: "Catégories", icon: FolderLibraryIcon },
  { href: "/orders", label: "Commandes", icon: ShoppingBag01Icon },
  { href: "/customers", label: "Utilisateurs", icon: UserGroup02Icon },
  { href: "/audit-log", label: "Journal d'audit", icon: Audit01Icon },
];

const disabledItems: typeof navItems = [];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 px-3">
        <h2 className="text-lg font-bold tracking-tight">NETEREKA</h2>
        <p className="text-xs text-muted-foreground">Administration</p>
      </div>
      {navItems.map((item) => {
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
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <HugeiconsIcon icon={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
      {disabledItems.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-40"
          aria-disabled="true"
        >
          <HugeiconsIcon icon={item.icon} size={20} />
          {item.label}
        </span>
      ))}
    </nav>
  );
}
