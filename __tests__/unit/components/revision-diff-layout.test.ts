import { describe, it, expect } from "vitest";
import {
  revisionLayout,
  bannerReviewFields,
  productReviewFields,
  changedScalarFields,
} from "@/components/admin/revision-diff";
import {
  BANNER_WRITABLE_COLUMN_LIST,
  PRODUCT_WRITABLE_COLUMN_LIST,
  BANNER_HTML_COLUMNS,
  PRODUCT_HTML_COLUMNS,
} from "@/lib/db/revisions";

describe("revisionLayout", () => {
  it("une révision publish se montre seule — pas d'état antérieur côté client", () => {
    expect(revisionLayout("publish")).toBe("single");
  });

  // § 2.7 : rendue en `update`, une création se réduisait à « Active : Non → Oui »
  // (le filtre d'égalité de `changedScalarFields` élimine tout ce que le modèle
  // vient d'écrire sur la ligne). Seule la mise en page `single` montre l'objet entier.
  it("une révision create se montre entière, jamais en diff", () => {
    expect(revisionLayout("create")).toBe("single");
  });

  it("une révision update se compare côte à côte à l'état actuel", () => {
    expect(revisionLayout("update")).toBe("side-by-side");
  });

  // Les trois natures ajoutées par la généralisation du MCP (images et
  // variantes, tables enfants — jamais des colonnes de products/banners)
  // partagent le même rendu dédié : `changedScalarFields` ne saurait pas les
  // représenter, et `ProductContentTabs` (Description/FAQ) n'a rien à voir
  // avec un ajout d'image ou un remplacement de variantes.
  it("une révision add_images utilise le rendu dédié aux tables enfants", () => {
    expect(revisionLayout("add_images")).toBe("child");
  });

  it("une révision remove_image utilise le rendu dédié aux tables enfants", () => {
    expect(revisionLayout("remove_image")).toBe("child");
  });

  it("une révision set_variants utilise le rendu dédié aux tables enfants", () => {
    expect(revisionLayout("set_variants")).toBe("child");
  });
});

describe("écran d'une création de bannière", () => {
  const row = {
    title: "Soldes", subtitle: null, link_url: "/c/promo", cta_text: "Voir", price: 15000,
    badge_text: "-20%", badge_color: "red", bg_gradient_from: "#183C78", bg_gradient_to: "#00FF9C",
    starts_at: "2026-10-01", ends_at: "2026-10-31", display_order: 4,
  };

  it("montre chaque champ rédigé par le modèle, même quand la ligne les porte déjà", () => {
    const shown = Object.fromEntries(bannerReviewFields(row as never).map((f) => [f.key, f.value]));
    expect(shown.title).toBe("Soldes");
    expect(shown.link_url).toBe("/c/promo");
    expect(shown.badge_text).toBe("-20%");
    expect(shown.badge_color).toBe("red");
    expect(shown.bg_gradient_from).toBe("#183C78");
    expect(shown.starts_at).toBe("2026-10-01");
    expect(shown.ends_at).toBe("2026-10-31");
    expect(shown.price).not.toBe("—");
  });

  it("le rendu en diff, lui, ne montrerait rien de ces champs (la raison d'être du type create)", () => {
    // La ligne porte déjà tout ; le payload répète les mêmes valeurs : le filtre d'égalité les retire.
    expect(changedScalarFields("banner", row, { title: "Soldes", link_url: "/c/promo" })).toEqual([]);
  });
});

describe("revisionLayout : pas de porte de sortie silencieuse", () => {
  it("une nature inconnue lève au lieu de tomber sur un écran vide", () => {
    expect(() => revisionLayout("withdraw" as never)).toThrow(/sans écran/);
  });
});

// Une colonne écrivable non affichée atteint la boutique sans relecture (B1).
describe("les écrans « objet entier » couvrent toutes les colonnes écrivables", () => {
  it("bannière : chaque colonne écrivable non HTML est affichée (image_url comprise)", () => {
    const shown = bannerReviewFields({} as never).map((f) => f.key);
    const expected = BANNER_WRITABLE_COLUMN_LIST.filter((c) => !(BANNER_HTML_COLUMNS as readonly string[]).includes(c));
    expect(shown.sort()).toEqual([...expected].sort());
    expect(shown).toContain("image_url");
  });

  it("produit : chaque colonne écrivable non HTML est affichée (is_featured comprise)", () => {
    const shown = productReviewFields({} as never).map((f) => f.key);
    const expected = PRODUCT_WRITABLE_COLUMN_LIST.filter((c) => !(PRODUCT_HTML_COLUMNS as readonly string[]).includes(c));
    expect(shown.sort()).toEqual([...expected].sort());
    expect(shown).toContain("is_featured");
  });
});
