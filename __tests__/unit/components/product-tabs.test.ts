import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/tabs", () => ({
  Tabs: vi.fn(), TabsContent: vi.fn(), TabsList: vi.fn(), TabsTrigger: vi.fn(),
}));
vi.mock("@/components/storefront/product-story", () => ({ ProductStory: vi.fn() }));

import { visibleProductTabs } from "@/components/storefront/product-details";

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
