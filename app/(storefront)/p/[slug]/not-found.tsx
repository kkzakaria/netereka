import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32 text-center">
      <h1 className="text-2xl font-bold">Produit introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ce produit n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
