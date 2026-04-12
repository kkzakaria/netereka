import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { StoreLocation01Icon } from "@hugeicons/core-free-icons";
import { SITE_NAME } from "@/lib/utils/constants";
import { HeaderAuth } from "@/components/storefront/header-auth";
import { CartIcon } from "@/components/storefront/cart-icon";
import { SearchAutocomplete } from "@/components/storefront/search-autocomplete";

const STORE_GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/NETEREKA/@5.2978885,-4.0074605,17z/data=!3m1!4b1!4m6!3m5!1s0xfc1ebc83e7573ef:0xc3d7dca5655f6b48!8m2!3d5.2978885!4d-4.0074605!16s%2Fg%2F11sv0z2l3v";

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
          <a
            href={STORE_GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notre boutique — voir sur Google Maps"
          >
            <HugeiconsIcon icon={StoreLocation01Icon} size={20} />
          </a>
          <CartIcon />
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}
