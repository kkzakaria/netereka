import { describe, it, expect } from "vitest";
import { sanitizeBannerContent } from "@/lib/db/storefront/banners";
import type { Banner } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 7, title: "OnePlus 15", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: "banners/7-a.jpg", link_url: "/p/oneplus-15", cta_text: "Découvrir",
    price: null, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: null, created_at: "", updated_at: "", ...over,
  };
}

describe("sanitizeBannerContent", () => {
  it("laisse inchangé un content_html déjà assaini et scopé pour cette bannière", () => {
    const html = "<style>.desc-banner-7 .a { color: red; }</style><div class=\"a\">Libre</div>";
    const [result] = sanitizeBannerContent([banner({ id: 7, content_html: html })]);
    expect(result.content_html).toBe(html);
  });

  it("retire un <script> injecté dans content_html", () => {
    const [result] = sanitizeBannerContent([
      banner({ content_html: "<div>Libre</div><script>alert(1)</script>" }),
    ]);
    expect(result.content_html).not.toContain("<script>");
    expect(result.content_html).not.toContain("alert(1)");
  });

  it("laisse content_html à null sans le transformer en chaîne vide", () => {
    const [result] = sanitizeBannerContent([banner({ content_html: null })]);
    expect(result.content_html).toBeNull();
  });

  it("scope le CSS avec l'identifiant banner-<id>, pas l'id nu", () => {
    const [result] = sanitizeBannerContent([
      banner({ id: 42, content_html: "<style>.a { color: red; }</style>" }),
    ]);
    expect(result.content_html).toContain(".desc-banner-42 .a");
  });
});
