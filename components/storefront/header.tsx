import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search } from "@hugeicons/core-free-icons";
import { SITE_NAME } from "@/lib/utils/constants";
import { getOptionalSession } from "@/lib/auth/guards";
import { HeaderUserMenu } from "@/components/storefront/header-user-menu";
import { CartIcon } from "@/components/storefront/cart-icon";

export async function Header() {
  const session = await getOptionalSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Rechercher"
          >
            <HugeiconsIcon icon={Search} size={20} />
          </Link>
          <CartIcon />
          <HeaderUserMenu user={session?.user ?? null} />
        </nav>
      </div>
    </header>
  );
}
