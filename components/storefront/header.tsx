import Link from "next/link";
import Image from "next/image";
import { SITE_NAME } from "@/lib/utils/constants";
import { HeaderAuth } from "@/components/storefront/header-auth";
import { CartIcon } from "@/components/storefront/cart-icon";
import { SearchAutocomplete } from "@/components/storefront/search-autocomplete";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center" aria-label="NETEREKA — Accueil">
          <Image
            src="/logo.png"
            alt={SITE_NAME}
            width={140}
            height={50}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-1">
          <SearchAutocomplete />
          <CartIcon />
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}
