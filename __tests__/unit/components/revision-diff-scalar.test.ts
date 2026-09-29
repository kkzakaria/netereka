import { describe, it, expect } from "vitest";
import { changedScalarFields } from "@/components/admin/revision-diff";

// Item 5 (revue de phase) : `changedScalarFields` alimente la carte « Autres
// champs modifiés » de l'écran /revisions/[id]. Sans le filtre avant !== après,
// une colonne renvoyée par le payload avec la MÊME valeur qu'en base (ex.
// `description_type` ré-envoyée par `productColumnsForRevision` chaque fois
// que `description_html` change) s'affichait comme une ligne de bruit
// « html → html » — mesuré sur 773 des 996 fiches publiées.
describe("changedScalarFields", () => {
  it("ne renvoie que les champs dont la valeur affichée change réellement", () => {
    const changes = changedScalarFields(
      "product",
      { name: "Ancien nom", description_type: "html", sku: "SKU-1" },
      { name: "Nouveau nom", description_type: "html", sku: "SKU-1" },
    );
    expect(changes.map((c) => c.key)).toEqual(["name"]);
  });

  it("porte un libellé pour description_type quand elle change réellement", () => {
    const changes = changedScalarFields(
      "product",
      { description_type: "richtext" },
      { description_type: "html" },
    );
    expect(changes).toEqual([{ key: "description_type", label: "Type de description", before: "richtext", after: "html" }]);
  });

  it("exclut toujours les colonnes HTML libre (description, faq_html), changées ou non", () => {
    const changes = changedScalarFields(
      "product",
      { description: "<p>Avant</p>" },
      { description: "<p>Après</p>" },
    );
    expect(changes).toEqual([]);
  });

  it("renvoie un tableau vide quand rien ne change côté bannière", () => {
    const changes = changedScalarFields("banner", { title: "Promo" }, { title: "Promo" });
    expect(changes).toEqual([]);
  });
});
