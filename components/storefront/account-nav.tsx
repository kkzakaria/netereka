"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/account", label: "Profil" },
  { href: "/account/orders", label: "Commandes" },
  { href: "/account/addresses", label: "Adresses" },
  { href: "/account/wishlist", label: "Favoris" },
  { href: "/account/reviews", label: "Avis" },
];

export function AccountNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/account") return pathname === "/account";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile tabs */}
      <nav className="mb-4 flex gap-1 overflow-x-auto md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
