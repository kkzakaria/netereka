import { describe, it, expect, vi } from "vitest";

vi.mock("embla-carousel-react", () => ({ default: vi.fn() }));
vi.mock("embla-carousel-autoplay", () => ({ default: vi.fn() }));
vi.mock("next/image", () => ({ default: vi.fn() }));
vi.mock("next/link", () => ({ default: vi.fn() }));

import { buildSlides } from "@/components/storefront/hero-banner";
import type { Banner, ProductCardData } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 1, title: "OnePlus 15", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: "banners/1-a.jpg", link_url: "/p/oneplus-15", cta_text: "Découvrir",
    price: null, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: null, created_at: "", updated_at: "", ...over,
  };
}

const PRODUCT = {
  id: "p1", slug: "x", name: "Produit X", base_price: 1000, compare_price: null,
  brand: "Marque", is_featured: 1, image_url: "products/p1/a.jpg",
} as unknown as ProductCardData;

describe("buildSlides", () => {
  it("porte le content_html de la bannière", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.content_html).toBe("<div>Libre</div>");
  });

  it("laisse content_html à null quand la bannière n'en a pas", () => {
    expect(buildSlides([banner()], [])[0].content_html).toBeNull();
  });

  it("conserve l'image et le lien comme champs structurés", () => {
    const [slide] = buildSlides([banner({ content_html: "<div>Libre</div>" })], []);
    expect(slide.image_url).toBe("banners/1-a.jpg");
    expect(slide.link_url).toBe("/p/oneplus-15");
  });

  it("retombe sur les produits en vedette sans content_html", () => {
    const slides = buildSlides([], [PRODUCT]);
    expect(slides).toHaveLength(1);
    expect(slides[0].content_html).toBeNull();
    expect(slides[0].title).toBe("Produit X");
  });

  it("ne rend aucune slide sans bannière ni produit", () => {
    expect(buildSlides([], [])).toEqual([]);
  });
});
