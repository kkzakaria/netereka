import Link from "next/link";
import Image from "next/image";
import { SITE_NAME } from "@/lib/utils/constants";

export default function NotFound() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Link href="/" aria-label="NETEREKA — Accueil">
            <Image src="/logo.png" alt={SITE_NAME} width={140} height={50} className="h-9 w-auto" />
          </Link>
        </div>
      </header>
      <main className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    </>
  );
}
