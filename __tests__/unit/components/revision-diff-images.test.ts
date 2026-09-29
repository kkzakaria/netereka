import { describe, it, expect } from "vitest";
import { imagesAfterRemoval } from "@/components/admin/revision-diff";
import type { ProductImage } from "@/lib/db/types";

function img(id: string, overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    id,
    product_id: "p1",
    variant_id: null,
    url: `${id}.jpg`,
    alt: null,
    sort_order: 0,
    is_primary: 0,
    ...overrides,
  };
}

// Extrait de RemoveImageDiff (components/admin/revision-diff.tsx) : c'est ce
// filtre qui décide, pour le panneau « Proposé » d'une révision
// remove_image, quelles images l'administrateur verra comme conservées. Un
// mauvais champ de comparaison montrerait « reste » une image qui disparaît
// en réalité, ou l'inverse.
describe("imagesAfterRemoval", () => {
  it("retire uniquement l'image ciblée, garde les autres dans l'ordre", () => {
    const images = [img("a"), img("b"), img("c")];
    expect(imagesAfterRemoval(images, "b")).toEqual([img("a"), img("c")]);
  });

  it("ne retire rien si l'id ne correspond à aucune image de la liste", () => {
    const images = [img("a"), img("b")];
    expect(imagesAfterRemoval(images, "z")).toEqual(images);
  });

  it("une liste vide reste vide", () => {
    expect(imagesAfterRemoval([], "a")).toEqual([]);
  });
});
