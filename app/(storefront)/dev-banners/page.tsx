import type { Metadata } from "next";
import { DeliveryBannerAbidjan } from "@/components/storefront/banners/delivery-banner-abidjan";

// Test/preview page — keep it out of the index and sitemap.
export const metadata: Metadata = {
  title: "Aperçu bannières — NETEREKA",
  robots: { index: false, follow: false },
};

export default function DevBannersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Page de test
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Aperçu des bannières</h1>
        <p className="text-sm text-muted-foreground">
          Vérifie le rendu, l’animation et la lisibilité à différentes largeurs. Active
          « réduire les animations » dans ton OS pour tester le fallback statique.
        </p>
      </header>

      {/* 1 — pleine largeur */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Livraison rapide à Abidjan — pleine largeur
        </h2>
        <DeliveryBannerAbidjan />
      </section>

      {/* 2 — avec lien (focus visible au clavier : Tab) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Variante cliquable (<code>href=&quot;/livraison&quot;</code> — Tab pour voir le focus)
        </h2>
        <DeliveryBannerAbidjan href="/livraison" />
      </section>

      {/* 3 — largeurs contraintes pour tester le responsive */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Largeurs contraintes (tablette / mobile)
        </h2>
        <div className="space-y-6">
          <div className="mx-auto w-[768px] max-w-full">
            <DeliveryBannerAbidjan />
          </div>
          <div className="mx-auto w-[480px] max-w-full">
            <DeliveryBannerAbidjan />
          </div>
          <div className="mx-auto w-[340px] max-w-full">
            <DeliveryBannerAbidjan />
          </div>
        </div>
      </section>
    </div>
  );
}
