import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";

export default function NotFound() {
  return (
    <>
      <Header />
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
      <Footer />
    </>
  );
}
