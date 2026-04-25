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
  StoreLocation01Icon,
  MessageMultiple02Icon,
  ChartLineData02Icon,
  WhatsappIcon,
  AiBrain01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useAdminSessionUser } from "./admin-user-context";

type Role = "agent" | "admin" | "super_admin";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  minRole: Role;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Opérations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, minRole: "agent" },
      { href: "/orders", label: "Commandes", icon: ShoppingBag01Icon, minRole: "agent" },
      { href: "/customers", label: "Clients", icon: UserGroup02Icon, minRole: "agent" },
      { href: "/whatsapp/conversations", label: "Conversations WA", icon: MessageMultiple02Icon, minRole: "agent" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/products", label: "Produits", icon: Package02Icon, minRole: "admin" },
      { href: "/categories", label: "Catégories", icon: FolderLibraryIcon, minRole: "admin" },
      { href: "/banners", label: "Bannières", icon: Image02Icon, minRole: "admin" },
      { href: "/stores", label: "Boutiques", icon: StoreLocation01Icon, minRole: "admin" },
      { href: "/whatsapp/analytics", label: "Analytics WA", icon: ChartLineData02Icon, minRole: "admin" },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { href: "/whatsapp/settings", label: "Config WhatsApp", icon: WhatsappIcon, minRole: "admin" },
      { href: "/ai-settings", label: "Config AI", icon: AiBrain01Icon, minRole: "admin" },
      { href: "/users", label: "Utilisateurs", icon: UserSettings01Icon, minRole: "admin" },
      { href: "/audit-log", label: "Journal d'audit", icon: Audit01Icon, minRole: "admin" },
    ],
  },
];

const ROLE_RANK: Record<Role, number> = { agent: 0, admin: 1, super_admin: 2 };

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAdminSessionUser();

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
        {navSections.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(
            (item) => ROLE_RANK[role] >= ROLE_RANK[item.minRole],
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="flex flex-col gap-1">
              <div
                className={cn(
                  "text-muted-foreground px-3 pb-2 text-xs font-medium uppercase tracking-wider",
                  sectionIdx === 0 ? "pt-0" : "pt-4",
                )}
              >
                {section.label}
              </div>
              {visibleItems.map((item) => {
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
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto">
        <SidebarUserMenu />
      </div>
    </div>
  );
}
