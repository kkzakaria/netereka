import { describe, it, expect } from "vitest";
import { isWithdrawalConfirmed } from "@/lib/revisions/withdraw-confirmation";
import {
  bannerWithdrawalReading,
  dateWithdrawalWarning,
  productWithdrawalReading,
} from "@/lib/revisions/withdraw-reading";
import type { BannerWithdrawImpact, ProductWithdrawImpact } from "@/lib/db/withdraw-impact";

describe("isWithdrawalConfirmed — la saisie qui vaut plus qu'un clic", () => {
  it("accepte le nom, sans égard à la casse ni aux espaces superflus", () => {
    expect(isWithdrawalConfirmed("  galaxy   s24 ", "Galaxy S24")).toBe(true);
  });

  it("refuse une saisie vide, partielle ou différente", () => {
    expect(isWithdrawalConfirmed("", "Galaxy S24")).toBe(false);
    expect(isWithdrawalConfirmed("Galaxy", "Galaxy S24")).toBe(false);
    expect(isWithdrawalConfirmed("Galaxy S24 Ultra", "Galaxy S24")).toBe(false);
    expect(isWithdrawalConfirmed("RETIRER", "Galaxy S24")).toBe(false);
    expect(isWithdrawalConfirmed(undefined, "Galaxy S24")).toBe(false);
  });

  it("ne confirme jamais quand le nom attendu est vide (saisie vide ≠ correspondance)", () => {
    expect(isWithdrawalConfirmed("", "")).toBe(false);
    expect(isWithdrawalConfirmed("   ", "  ")).toBe(false);
  });

  it("compare les accents tels quels : « Téléphone » n'est pas « Telephone »", () => {
    expect(isWithdrawalConfirmed("Telephone", "Téléphone")).toBe(false);
    expect(isWithdrawalConfirmed("Téléphone", "Téléphone")).toBe(true);
  });
});

const product: ProductWithdrawImpact = {
  kind: "product", name: "Galaxy S24", slug: "galaxy-s24", is_active: true, is_draft: false, is_featured: false,
  category_trail: [{ id: "c2", name: "Smartphones", slug: "smartphones", is_active: true }, { id: "c1", name: "Téléphones", slug: "telephones", is_active: true }],
  stock_quantity: 12, active_variant_count: 2, orders_total: 4, orders_open: 2, wishlist_count: 2, whatsapp_cart_count: 0, displayed_banner_count: 4,
};

describe("productWithdrawalReading — le texte de l'écran", () => {
  const text = (lines: { text: string }[]) => lines.map((l) => l.text).join("\n");

  it("nomme la page, chaque catégorie et la recherche", () => {
    const r = productWithdrawalReading(product);
    const t = text(r.disappears);
    expect(t).toContain("/p/galaxy-s24");
    expect(t).toContain("2 pages catégorie : Smartphones, Téléphones");
    expect(t).toContain("recherche");
  });

  it("une fiche en vedette le dit en avertissement ; une fiche ordinaire n'en parle pas", () => {
    const featured = productWithdrawalReading({ ...product, is_featured: true });
    expect(featured.disappears.find((l) => l.text.includes("EN VEDETTE"))?.warning).toBe(true);
    expect(text(productWithdrawalReading(product).disappears)).not.toContain("VEDETTE");
  });

  // Le hero ne montre les fiches en vedette que s'il n'y a AUCUNE bannière
  // affichée : avec des bannières, le dire serait une conséquence inventée.
  it("ne prétend pas que le hero est touché tant que des bannières sont affichées", () => {
    const r = productWithdrawalReading({ ...product, is_featured: true, displayed_banner_count: 4 });
    const t = text(r.disappears);
    expect(t).toContain("« Meilleures ventes »");
    expect(t).not.toContain("le hero montre");
    expect(t).toContain("Le hero n'est pas concerné : il affiche 4 bannières");
  });

  it("dit que le hero est concerné (trois premières) quand aucune bannière n'est affichée", () => {
    const r = productWithdrawalReading({ ...product, is_featured: true, displayed_banner_count: 0 });
    expect(text(r.disappears)).toContain("le hero montre les fiches en vedette (les trois premières)");
  });

  it("chiffre les commandes, dont celles en cours, et avertit quand il y en a", () => {
    const line = productWithdrawalReading(product).stays.find((l) => l.text.startsWith("Commandes"))!;
    expect(line.text).toContain("4");
    expect(line.text).toContain("dont 2 en cours");
    expect(line.warning).toBe(true);
  });

  it("un zéro mesuré s'affiche : « 0 », jamais une ligne absente", () => {
    const r = productWithdrawalReading({ ...product, orders_total: 0, orders_open: 0, wishlist_count: 0 });
    const t = text(r.stays);
    expect(t).toContain("Commandes qui la référencent : 0.");
    expect(t).toContain("Listes d'envies qui la contiennent : 0.");
    expect(t).toContain("Paniers WhatsApp qui la contiennent : 0.");
    expect(r.stays.find((l) => l.text.startsWith("Commandes"))?.warning).toBe(false);
  });

  it("dit que le retrait est réversible et que rien n'est supprimé", () => {
    const r = productWithdrawalReading(product);
    expect(r.reversible).toContain("réversible");
    expect(r.reversible).toContain("rien n'est supprimé");
  });

  it("la saisie attendue est le nom du produit", () => {
    expect(productWithdrawalReading(product).confirmName).toBe("Galaxy S24");
  });

  it("une fiche déjà invisible le signale et ne liste rien qui disparaisse", () => {
    const r = productWithdrawalReading({ ...product, is_active: false });
    expect(r.alreadyHidden).toContain("déjà retirée");
    expect(r.disappears).toEqual([]);
    expect(productWithdrawalReading({ ...product, is_draft: true }).alreadyHidden).toContain("brouillon");
  });
});

const banner: BannerWithdrawImpact = {
  kind: "banner", title: "Soldes", is_active: true, starts_at: null, ends_at: null, window: "live",
  displayed_now: true, position: 2, displayed_total: 3, displayed_after: 2,
};

describe("bannerWithdrawalReading", () => {
  it("donne la place dans le carrousel et ce qu'il en reste", () => {
    const t = bannerWithdrawalReading(banner).disappears.map((l) => l.text).join("\n");
    expect(t).toContain("position 2 sur 3");
    expect(t).toContain("Il restera 2 bannières");
  });

  it("retirer la dernière bannière avertit que le hero bascule sur les produits en vedette", () => {
    const r = bannerWithdrawalReading({ ...banner, position: 1, displayed_total: 1, displayed_after: 0 });
    const line = r.disappears.find((l) => l.text.includes("dernière"))!;
    expect(line.warning).toBe(true);
    expect(line.text).toContain("produits en vedette");
  });

  it("une bannière expirée n'est pas « retirée » d'un carrousel où elle n'est déjà plus", () => {
    const r = bannerWithdrawalReading({ ...banner, window: "expired", displayed_now: false, position: null, ends_at: "2026-09-01 00:00:00" });
    expect(r.alreadyHidden).toContain("dépassée");
    expect(r.disappears).toEqual([]);
  });

  it("dit que c'est réversible", () => {
    expect(bannerWithdrawalReading(banner).reversible).toContain("réversible");
    expect(bannerWithdrawalReading(banner).confirmName).toBe("Soldes");
  });
});

describe("dateWithdrawalWarning — une date passée retire sans s'appeler retrait", () => {
  const NOW = "2026-10-01 12:00:00";
  const live = { is_active: 1, starts_at: null, ends_at: null };

  it("avertit quand une ends_at passée sort du carrousel une bannière affichée", () => {
    expect(dateWithdrawalWarning(live, { ends_at: "2026-09-01 00:00:00" }, NOW)).toContain("retirent la bannière");
  });

  it("avertit aussi pour une starts_at future", () => {
    expect(dateWithdrawalWarning(live, { starts_at: "2026-12-01 00:00:00" }, NOW)).not.toBeNull();
  });

  it("se tait pour une date future, pour un payload sans date et pour une bannière déjà masquée", () => {
    expect(dateWithdrawalWarning(live, { ends_at: "2026-12-31 00:00:00" }, NOW)).toBeNull();
    expect(dateWithdrawalWarning(live, { title: "x" }, NOW)).toBeNull();
    expect(dateWithdrawalWarning({ ...live, is_active: 0 }, { ends_at: "2026-09-01 00:00:00" }, NOW)).toBeNull();
    expect(dateWithdrawalWarning({ ...live, ends_at: "2026-09-01 00:00:00" }, { ends_at: "2026-09-02 00:00:00" }, NOW)).toBeNull();
  });

  it("efface une date (null) : start future retirée ne déclenche rien", () => {
    expect(dateWithdrawalWarning({ is_active: 1, starts_at: null, ends_at: "2026-12-31 00:00:00" }, { ends_at: null }, NOW)).toBeNull();
  });
});

describe("clé KV du hero : une seule définition", () => {
  it("ni le middleware ni refreshHeroPreload ne la réécrivent en dur", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["middleware.ts", "lib/cloudflare/hero-preload.ts"]) {
      expect(readFileSync(f, "utf8"), f).not.toContain('"hero:lcp:preload-url"');
    }
  });
});
