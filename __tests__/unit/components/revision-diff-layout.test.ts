import { describe, it, expect } from "vitest";
import {
  revisionLayout,
  bannerReviewFields,
  productReviewFields,
  changedScalarFields,
  currentViewFields,
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

  // § 2.6 : un retrait est une absence. Ni diff ni objet neuf : l'écran montre
  // ce qui disparaît. Tomber sur "side-by-side" l'afficherait comme une
  // modification, « is_active : true → false » déguisé en champ.
  it("une révision withdraw a son propre écran, jamais celui d'une modification", () => {
    expect(revisionLayout("withdraw")).toBe("withdrawal");
  });

  // § 2.6 bis : une remise en ligne est une apparition. Pas de diff (rien à comparer : la
  // fiche existe déjà, seule sa visibilité change) et pas l'écran d'un retrait (qui demande une saisie).
  it("une révision reactivate a son propre écran : la fiche entière avec ses constats, ni diff ni retrait", () => {
    expect(revisionLayout("reactivate")).toBe("reactivation");
    expect(revisionLayout("reactivate")).not.toBe(revisionLayout("withdraw"));
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
    expect(() => revisionLayout("bogus" as never)).toThrow(/sans écran/);
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

// § 2.6 : ni le diff de champs ni l'écran « objet entier » ne savent lire un
// retrait ; `is_active` n'est plus une colonne écrivable de bannière.
describe("libellés des champs de bannière : chaque colonne écrivable a le sien", () => {
  it("changedScalarFields traduit TOUTES les colonnes écrivables non HTML, sans nom de colonne brut", () => {
    const payload = Object.fromEntries(
      BANNER_WRITABLE_COLUMN_LIST.filter((c) => !(BANNER_HTML_COLUMNS as readonly string[]).includes(c)).map((c) => [c, "x"]),
    );
    const changes = changedScalarFields("banner", {}, payload);
    expect(changes.map((c) => c.key).sort()).toEqual(Object.keys(payload).sort());
    for (const c of changes) expect(c.label, `colonne ${c.key} affichée en nom brut`).not.toBe(c.key);
  });

  it("ends_at et starts_at se lisent en clair (une ends_at passée est un retrait de fait)", () => {
    const labels = Object.fromEntries(
      changedScalarFields("banner", {}, { starts_at: "a", ends_at: "b", badge_color: "red" }).map((c) => [c.key, c.label]),
    );
    expect(labels).toEqual({ starts_at: "Début d'affichage", ends_at: "Fin d'affichage", badge_color: "Couleur du badge" });
  });

  it("is_active n'est plus écrivable sur une bannière", () => {
    expect(BANNER_WRITABLE_COLUMN_LIST).not.toContain("is_active");
  });

  it("idem côté fiche : chaque colonne écrivable non HTML a son libellé", () => {
    const payload = Object.fromEntries(
      PRODUCT_WRITABLE_COLUMN_LIST.filter((c) => !(PRODUCT_HTML_COLUMNS as readonly string[]).includes(c)).map((c) => [c, "x"]),
    );
    for (const c of changedScalarFields("product", {}, payload)) {
      expect(c.label, `colonne ${c.key} affichée en nom brut`).not.toBe(c.key);
    }
  });
});

// § 2.6 rend la carte « telle qu'un client la voit maintenant » porteuse de la
// relecture d'un retrait : elle n'affichait ni le nom ni le prix d'un produit,
// ni titre, badge, prix, dégradé ou image d'une bannière.
describe("currentViewFields : ce que la carte du retrait montre d'une cible", () => {
  const banner = {
    title: "Soldes", subtitle: "Jusqu'à -30%", badge_text: "-30%", badge_color: "red", image_url: "banners/soldes.webp",
    link_url: "/c/promo", cta_text: "Voir", price: 150000, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    content_html: null, display_order: 0, starts_at: null, ends_at: null,
  };
  const product = { name: "Galaxy S24", base_price: 500000, brand: "Samsung", stock_quantity: 12 };

  it("une bannière : titre, badge, prix, dégradé et image sont tous là, avec leur valeur", () => {
    const shown = Object.fromEntries(currentViewFields("banner", banner as never).map((f) => [f.key, f.value]));
    expect(shown.title).toBe("Soldes");
    expect(shown.badge_text).toBe("-30%");
    expect(shown.image_url).toBe("banners/soldes.webp");
    expect(shown.bg_gradient_from).toBe("#183C78");
    expect(shown.price).not.toBe("—");
  });

  it("un produit : nom et prix y sont, le prix formaté", () => {
    const shown = Object.fromEntries(currentViewFields("product", product as never).map((f) => [f.key, f.value]));
    expect(shown.name).toBe("Galaxy S24");
    expect(shown.base_price).not.toBe("—");
    expect(shown.base_price).not.toBe("500000");
    expect(shown.brand).toBe("Samsung");
  });
});

// Sur 42 fiches de production, la carte affichait « Stock : 99 » juste au-dessus de
// « Stock nul : variantes à 0 » : la colonne de la fiche n'est pas le stock vendable.
describe("le libellé du stock dit de quel stock il parle", () => {
  it("la colonne products.stock_quantity se lit « Stock de la fiche », jamais « Stock » seul", () => {
    const label = productReviewFields({ stock_quantity: 99 } as never).find((f) => f.key === "stock_quantity")!.label;
    expect(label).toBe("Stock de la fiche");
  });
});
