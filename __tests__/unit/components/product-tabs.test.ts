import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/tabs", () => ({
  Tabs: vi.fn(), TabsContent: vi.fn(), TabsList: vi.fn(), TabsTrigger: vi.fn(),
}));
vi.mock("@/components/storefront/product-story", () => ({ ProductStory: vi.fn() }));

import { visibleProductTabs, shouldRenderProductDetails } from "@/components/storefront/product-details";

describe("visibleProductTabs", () => {
  it("affiche les quatre onglets quand tout est renseigné", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: "<div>q</div>", attributeCount: 3 }))
      .toEqual(["description", "details", "reviews", "faq"]);
  });

  it("garde toujours l'onglet Avis, même sans contenu ailleurs", () => {
    expect(visibleProductTabs({ description: null, faqHtml: null, attributeCount: 0 }))
      .toEqual(["reviews"]);
  });

  it("masque Description quand la description est vide ou blanche", () => {
    expect(visibleProductTabs({ description: "   ", faqHtml: null, attributeCount: 0 }))
      .not.toContain("description");
  });

  it("masque Détails produit sans attribut", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: null, attributeCount: 0 }))
      .toEqual(["description", "reviews"]);
  });

  it("masque FAQ sans faq_html", () => {
    expect(visibleProductTabs({ description: "<p>x</p>", faqHtml: "", attributeCount: 1 }))
      .toEqual(["description", "details", "reviews"]);
  });

  it("conserve toujours l'ordre Description, Détails, Avis, FAQ", () => {
    const tabs = visibleProductTabs({ description: "<p>x</p>", faqHtml: "<div>q</div>", attributeCount: 2 });
    expect(tabs.indexOf("description")).toBeLessThan(tabs.indexOf("details"));
    expect(tabs.indexOf("details")).toBeLessThan(tabs.indexOf("reviews"));
    expect(tabs.indexOf("reviews")).toBeLessThan(tabs.indexOf("faq"));
  });
});

describe("shouldRenderProductDetails", () => {
  it("masque la section quand Avis est le seul onglet et qu'il n'y a aucun avis", () => {
    const tabs = visibleProductTabs({ description: null, faqHtml: null, attributeCount: 0 });
    expect(tabs).toEqual(["reviews"]);
    expect(shouldRenderProductDetails(tabs, false)).toBe(false);
  });

  it("affiche la section quand Avis est le seul onglet mais qu'il y a de vrais avis", () => {
    const tabs = visibleProductTabs({ description: null, faqHtml: null, attributeCount: 0 });
    expect(tabs).toEqual(["reviews"]);
    expect(shouldRenderProductDetails(tabs, true)).toBe(true);
  });

  it("affiche toujours la section dès qu'un autre onglet est présent, avis ou non", () => {
    const tabs = visibleProductTabs({ description: "<p>x</p>", faqHtml: null, attributeCount: 0 });
    expect(shouldRenderProductDetails(tabs, false)).toBe(true);
    expect(shouldRenderProductDetails(tabs, true)).toBe(true);
  });
});
