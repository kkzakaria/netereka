import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/actions/search", () => ({ loadMoreSearchProducts: vi.fn() }));
vi.mock("@/components/storefront/product-grid", () => ({ ProductGrid: () => null }));

import { ProductListWithMore, isPlainLeftClick } from "@/components/storefront/product-list-with-more";

function render(props: Partial<Parameters<typeof ProductListWithMore>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(ProductListWithMore, {
      initialProducts: [],
      initialHasMore: true,
      searchOpts: {},
      limit: 20,
      initialNextOffset: 20,
      ...props,
    }),
  );
}

describe("ProductListWithMore — « Charger plus »", () => {
  it("avec pagination : un vrai lien vers la page suivante, crawlable", () => {
    const html = render({ pagination: { basePath: "/c/tv", params: {} } });
    expect(html).toMatch(/<a [^>]*href="\/c\/tv\?page=2"[^>]*>Charger plus<\/a>/);
    expect(html).not.toContain("<button");
  });

  it("depuis la page 3 : le lien vise la page 4", () => {
    const html = render({ initialNextOffset: 60, pagination: { basePath: "/c/tv", params: {} } });
    expect(html).toContain('href="/c/tv?page=4"');
  });

  it("sans pagination : un bouton, aucun lien", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*>Charger plus<\/button>/);
    expect(html).not.toContain("href=");
  });

  it("rien quand il n'y a plus de produits", () => {
    const html = render({ initialHasMore: false, pagination: { basePath: "/c/tv", params: {} } });
    expect(html).not.toContain("Charger plus");
  });
});

describe("isPlainLeftClick", () => {
  const base = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 };

  it("clic gauche simple → chargé sur place", () => {
    expect(isPlainLeftClick(base)).toBe(true);
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
    ["Maj", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["bouton du milieu", { button: 1 }],
  ])("%s → laissé au navigateur (nouvel onglet)", (_, over) => {
    expect(isPlainLeftClick({ ...base, ...over })).toBe(false);
  });
});
