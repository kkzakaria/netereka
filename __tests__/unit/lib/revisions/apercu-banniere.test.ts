import { describe, it, expect } from "vitest";
import { banniereApresRevision } from "@/lib/revisions/apercu-banniere";
import { BANNER_WRITABLE_COLUMN_LIST, type RevisionRecord } from "@/lib/db/revisions";
import type { Banner } from "@/lib/db/types";

/**
 * Un aperçu ne vaut que s'il ne ment pas. Ces tests vérifient qu'il montre
 * EXACTEMENT ce que `applyRevision` produirait — ni plus (une colonne que
 * l'application ne poserait pas), ni moins.
 */
const COURANTE: Banner = {
  id: 7, title: "Avant", subtitle: "Sous-titre", badge_text: "PROMO", badge_color: "mint",
  image_url: "banners/7-a.png", link_url: "/p/avant", cta_text: "Découvrir", price: 100,
  bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F", content_html: "<p>avant</p>",
  display_order: 0, is_active: 1, starts_at: null, ends_at: null,
  created_at: "", updated_at: "",
};

function revision(kind: RevisionRecord["kind"], payload: Record<string, unknown>): RevisionRecord {
  return {
    id: "rev", target_type: "banner", target_id: "7", kind, payload, origin: "mcp",
    actor_id: "a", actor_name: "A", summary: null, status: "pending",
    base_version: null, created_at: "", resolved_at: null, resolved_by: null,
  };
}

describe("banniereApresRevision : ce que l'application produirait", () => {
  it("applique les colonnes proposées, laisse les autres intactes", () => {
    const a = banniereApresRevision(COURANTE, revision("update", { title: "Après", content_html: "<p>après</p>" }));
    expect(a.title).toBe("Après");
    expect(a.content_html).toBe("<p>après</p>");
    expect(a.subtitle).toBe("Sous-titre");
    expect(a.image_url).toBe("banners/7-a.png");
  });

  it("un null du payload EFFACE, il n'est pas ignoré", () => {
    const a = banniereApresRevision(COURANTE, revision("update", { image_url: null, subtitle: null }));
    expect(a.image_url).toBeNull();
    expect(a.subtitle).toBeNull();
  });

  /**
   * LE test de non-mensonge. Une clé hors liste blanche est refusée AU DÉPÔT
   * par `assertValidPayload` : elle ne pourrait jamais atteindre la ligne.
   * La montrer ici promettrait un rendu que l'application ne produirait pas.
   */
  it("ignore une colonne hors liste blanche, comme l'application le ferait", () => {
    const a = banniereApresRevision(COURANTE, revision("update", { title: "Après", created_at: "2000-01-01", inventee: "x" }));
    expect(a.title).toBe("Après");
    expect(a.created_at).toBe("");
    expect(a).not.toHaveProperty("inventee");
  });

  // § 2.6 : `is_active` n'est pas inscriptible. C'est la NATURE qui décide,
  // jamais le payload — sans quoi un aperçu montrerait une bannière active
  // que l'application laisserait masquée.
  it("une création active, et le payload ne peut pas en décider", () => {
    const inactive = { ...COURANTE, is_active: 0 };
    expect(banniereApresRevision(inactive, revision("create", { content_html: "<p>x</p>" })).is_active).toBe(1);
    expect(banniereApresRevision(inactive, revision("create", { is_active: 0 })).is_active).toBe(1);
  });

  it("un retrait désactive, et le payload ne peut pas en décider", () => {
    expect(banniereApresRevision(COURANTE, revision("withdraw", {})).is_active).toBe(0);
    expect(banniereApresRevision(COURANTE, revision("withdraw", { is_active: 1 })).is_active).toBe(0);
  });

  it("une nature enfant ne change rien : elle est refusée sur une bannière", () => {
    expect(banniereApresRevision(COURANTE, revision("add_images", { images: [{ key: "x" }] }))).toEqual(COURANTE);
  });

  it("ne modifie jamais la bannière reçue", () => {
    const copie = { ...COURANTE };
    banniereApresRevision(COURANTE, revision("update", { title: "Après" }));
    expect(COURANTE).toEqual(copie);
  });

  /**
   * Couplage : si une colonne est ajoutée à la liste blanche sans que
   * l'aperçu la reprenne, il montrerait l'ancienne valeur d'un champ que
   * l'application changerait. Ce test lit la liste et les éprouve toutes.
   */
  it("reprend TOUTES les colonnes de la liste blanche, pas une sélection figée", () => {
    const payload: Record<string, unknown> = {};
    for (const c of BANNER_WRITABLE_COLUMN_LIST) payload[c] = c === "display_order" || c === "price" ? 42 : `valeur-${c}`;
    const a = banniereApresRevision(COURANTE, revision("update", payload)) as unknown as Record<string, unknown>;
    for (const c of BANNER_WRITABLE_COLUMN_LIST) {
      expect(a[c], `${c} non repris par l'aperçu`).toBe(payload[c]);
    }
  });
});
