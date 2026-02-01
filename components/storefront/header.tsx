import Link from "next/link";
import { SITE_NAME } from "@/lib/utils/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-4">
          {/* Navigation items - to be implemented */}
        </nav>
      </div>
    </header>
  );
}
