import { describe, it, expect } from "vitest";
import { produitApresRevision } from "@/lib/revisions/apercu-produit";
import { PRODUCT_WRITABLE_COLUMN_LIST, type RevisionRecord } from "@/lib/db/revisions";
import type { ProductDetail } from "@/lib/db/types";

/**
 * Un aperçu ne vaut que s'il ne ment pas : il doit montrer EXACTEMENT ce que
 * `applyRevision` produirait — ni une colonne de plus, ni une de moins.
 */
const COURANT = {
  id: "p1", name: "Avant", description: "<p>avant</p>", description_type: "html",
  faq_html: "<p>faq</p>", short_description: null, base_price: 1000, compare_price: null,
  sku: null, brand: "Marque", is_featured: 0, stock_quantity: 5, low_stock_threshold: 1,
  weight_grams: null, meta_title: null, meta_description: null, category_id: "c1",
  slug: "avant", is_draft: 1, is_active: 0, created_at: "", updated_at: "",
  images: [], variants: [], attributes: [],
} as unknown as ProductDetail;

function revision(kind: RevisionRecord["kind"], payload: Record<string, unknown>): RevisionRecord {
  return {
    id: "rev", target_type: "product", target_id: "p1", kind, payload, origin: "mcp",
    actor_id: "a", actor_name: "A", summary: null, status: "pending",
    base_version: null, created_at: "", resolved_at: null, resolved_by: null,
  };
}

describe("produitApresRevision : ce que l'application produirait", () => {
  it("applique les colonnes proposées, laisse les autres intactes", () => {
    const a = produitApresRevision(COURANT, revision("update", { description: "<p>après</p>", name: "Après" }));
    expect(a.description).toBe("<p>après</p>");
    expect(a.name).toBe("Après");
    expect(a.faq_html).toBe("<p>faq</p>");
    expect(a.brand).toBe("Marque");
  });

  /**
   * `attributes` et `slug` ne sont pas des colonnes de `products` : les
   * outils les refusent avant le dépôt, et `productColumnsForRevision` les
   * ignorerait. Les montrer promettrait un rendu que l'application ne
   * produirait pas.
   */
  it("ignore attributes et slug, comme l'application le ferait", () => {
    const a = produitApresRevision(COURANT, revision("update", {
      description: "<p>après</p>",
      attributes: [{ name: "Couleur", value: "Noir" }],
      slug: "autre-slug",
    }));
    expect(a.attributes).toEqual([]);
    expect(a.slug).toBe("avant");
  });

  // § 2.8 : publier rend VISIBLE. Ne lever que `is_draft` publiait une fiche
  // que la vitrine continuait de filtrer sur `is_active`.
  it("une publication lève is_draft ET is_active", () => {
    const a = produitApresRevision(COURANT, revision("publish", {}));
    expect(a.is_draft).toBe(0);
    expect(a.is_active).toBe(1);
  });

  it("un retrait désactive, une remise en ligne réactive", () => {
    expect(produitApresRevision(COURANT, revision("withdraw", {})).is_active).toBe(0);
    expect(produitApresRevision(COURANT, revision("reactivate", {})).is_active).toBe(1);
  });

  // Ces natures n'écrivent aucune colonne de `products` : prétendre montrer
  // leur effet ferait croire que l'écran juge ce qu'il ne sait pas composer.
  it("une nature enfant ne change rien à la fiche", () => {
    expect(produitApresRevision(COURANT, revision("add_images", { images: [{ key: "x" }] }))).toEqual(COURANT);
    expect(produitApresRevision(COURANT, revision("set_variants", { variants: [] }))).toEqual(COURANT);
  });

  it("ne modifie jamais la fiche reçue", () => {
    const copie = { ...COURANT };
    produitApresRevision(COURANT, revision("update", { name: "Après" }));
    expect(COURANT).toEqual(copie);
  });

  /**
   * Couplage : une colonne ajoutée à la liste blanche sans que l'aperçu la
   * reprenne montrerait l'ancienne valeur d'un champ que l'application
   * changerait. Ce test lit la liste et les éprouve toutes.
   */
  it("reprend TOUTES les colonnes de la liste blanche, pas une sélection figée", () => {
    const payload: Record<string, unknown> = {};
    for (const c of PRODUCT_WRITABLE_COLUMN_LIST) payload[c] = `valeur-${c}`;
    const a = produitApresRevision(COURANT, revision("update", payload)) as unknown as Record<string, unknown>;
    for (const c of PRODUCT_WRITABLE_COLUMN_LIST) {
      expect(a[c], `${c} non repris par l'aperçu`).toBe(payload[c]);
    }
  });
});
