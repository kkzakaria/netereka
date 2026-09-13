import { describe, it, expect } from "vitest";
import { banners, products } from "@/lib/db/schema";

describe("colonnes de contenu libre", () => {
  it("banners expose content_html", () => {
    expect(banners.content_html).toBeDefined();
    expect(banners.content_html.name).toBe("content_html");
    expect(banners.content_html.notNull).toBe(false);
  });

  it("products expose faq_html", () => {
    expect(products.faq_html).toBeDefined();
    expect(products.faq_html.name).toBe("faq_html");
    expect(products.faq_html.notNull).toBe(false);
  });
});
