import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/db/stores", () => ({ getActiveStores: vi.fn(async () => []) }));
vi.mock("@/components/storefront/header-auth", () => ({ HeaderAuth: () => null }));
vi.mock("@/components/storefront/cart-icon", () => ({ CartIcon: () => null }));
vi.mock("@/components/storefront/search-autocomplete", () => ({ SearchAutocomplete: () => null }));
vi.mock("@/components/storefront/store-location-button", () => ({ StoreLocationButton: () => null }));
vi.mock("@/components/storefront/cookie-settings-button", () => ({ CookieSettingsButton: () => null }));
vi.mock("@/components/storefront/scroll-container", () => ({
  ScrollContainer: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/components/storefront/product-card", () => ({ ProductCard: () => null }));

import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import type { ProductCardData } from "@/lib/db/types";

const VOEUX = "Toute l&#x27;équipe NETEREKA vous souhaite de belles fêtes";

describe("Footer", () => {
  it("souhaite de belles fêtes pendant la saison", () => {
    expect(renderToStaticMarkup(createElement(Footer, { festif: true }))).toContain(VOEUX);
  });

  it("se tait hors saison", () => {
    expect(renderToStaticMarkup(createElement(Footer, { festif: false }))).not.toContain(VOEUX);
  });
});

describe("Header", () => {
  const decorsAriaHidden = (html: string) => (html.match(/<svg[^>]*aria-hidden="true"/g) ?? []).length;

  it("porte la guirlande et l'étoile du logo pendant la saison", async () => {
    const html = renderToStaticMarkup(await Header({ festif: true }));
    expect(html).toContain("guirlande-fetes");
    expect(decorsAriaHidden(html)).toBe(2);
  });

  it("n'a aucun décor hors saison", async () => {
    const html = renderToStaticMarkup(await Header({ festif: false }));
    expect(html).not.toContain("guirlande-fetes");
    expect(decorsAriaHidden(html)).toBe(0);
  });
});

describe("HorizontalSection", () => {
  it("marque son titre pour le soulignement festif", () => {
    const html = renderToStaticMarkup(
      createElement(HorizontalSection, {
        title: "Nouveautés",
        products: [{ id: "p1" } as ProductCardData],
      }),
    );
    expect(html).toMatch(/<h2[^>]*data-slot="section-title"/);
  });
});
