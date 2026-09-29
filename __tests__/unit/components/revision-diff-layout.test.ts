import { describe, it, expect } from "vitest";
import { revisionLayout } from "@/components/admin/revision-diff";

describe("revisionLayout", () => {
  it("une révision publish se montre seule — pas d'état antérieur côté client", () => {
    expect(revisionLayout("publish")).toBe("single");
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
