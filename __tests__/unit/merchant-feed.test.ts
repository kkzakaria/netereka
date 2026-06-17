import { describe, it, expect } from "vitest";
import { escapeXml, stripHtml, formatPrice, availabilityFor } from "@/lib/seo/merchant-feed";
import { googleCategoryFor } from "@/lib/seo/merchant-feed";
import { absolutize } from "@/lib/seo/merchant-feed";
import { buildFeedItem, type FeedProduct } from "@/lib/seo/merchant-feed";

describe("escapeXml", () => {
  it("escapes XML-significant characters", () => {
    expect(escapeXml(`A & B < C > "D" 'E'`)).toBe("A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;");
  });
  it("returns empty string for null/undefined", () => {
    expect(escapeXml(null)).toBe("");
    expect(escapeXml(undefined)).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>world</b></p>\n<p>!</p>")).toBe("Hello world !");
  });
  it("decodes common entities", () => {
    expect(stripHtml("Tom &amp; Jerry &lt;3 &quot;x&quot;")).toBe('Tom & Jerry <3 "x"');
  });
  it("returns empty string for null", () => {
    expect(stripHtml(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats an integer amount as XOF", () => {
    expect(formatPrice(150000)).toBe("150000 XOF");
  });
});

describe("availabilityFor", () => {
  it("is in_stock when quantity > 0", () => {
    expect(availabilityFor(3)).toBe("in_stock");
  });
  it("is out_of_stock when quantity is 0 or less", () => {
    expect(availabilityFor(0)).toBe("out_of_stock");
    expect(availabilityFor(-1)).toBe("out_of_stock");
  });
});

describe("googleCategoryFor", () => {
  it("maps a top-level category slug", () => {
    expect(googleCategoryFor("smartphones", null)).toBe(267);
    expect(googleCategoryFor("ecouteurs", null)).toBe(543626);
  });
  it("falls back to the parent slug when the child is unmapped", () => {
    expect(googleCategoryFor("apple", "smartphones")).toBe(267);
  });
  it("returns undefined for an unmapped category", () => {
    expect(googleCategoryFor("inconnu", null)).toBeUndefined();
    expect(googleCategoryFor(null, null)).toBeUndefined();
  });
});

describe("absolutize", () => {
  const site = "https://netereka.ci";
  it("leaves absolute http(s) URLs untouched", () => {
    expect(absolutize("https://cdn.example/x.jpg", site)).toBe("https://cdn.example/x.jpg");
  });
  it("prefixes the site URL for root-relative paths", () => {
    expect(absolutize("/images/x.jpg", site)).toBe("https://netereka.ci/images/x.jpg");
  });
  it("returns empty string for empty input", () => {
    expect(absolutize("", site)).toBe("");
  });
});

const base: FeedProduct = {
  id: "p1",
  slug: "apple-iphone-17",
  name: "Apple iPhone 17 256 Go",
  description: "<p>Super <b>téléphone</b></p>",
  descriptionType: "html",
  shortDescription: null,
  basePrice: 530000,
  comparePrice: null,
  sku: "IPH17-256",
  brand: "Apple",
  stockQuantity: 4,
  categorySlug: "smartphones",
  categoryName: "Smartphones",
  parentCategorySlug: null,
  primaryImage: "https://netereka.ci/img/iphone-1.jpg",
  additionalImages: ["https://netereka.ci/img/iphone-2.jpg"],
};

describe("buildFeedItem", () => {
  it("emits required attributes for a simple in-stock product", () => {
    const xml = buildFeedItem(base, "https://netereka.ci");
    expect(xml).toContain("<g:id>p1</g:id>");
    expect(xml).toContain("<g:title>Apple iPhone 17 256 Go</g:title>");
    expect(xml).toContain("<g:link>https://netereka.ci/p/apple-iphone-17</g:link>");
    expect(xml).toContain("<g:image_link>https://netereka.ci/img/iphone-1.jpg</g:image_link>");
    expect(xml).toContain("<g:additional_image_link>https://netereka.ci/img/iphone-2.jpg</g:additional_image_link>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:price>530000 XOF</g:price>");
    expect(xml).toContain("<g:brand>Apple</g:brand>");
    expect(xml).toContain("<g:mpn>IPH17-256</g:mpn>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:google_product_category>267</g:google_product_category>");
    expect(xml).toContain("<g:product_type>Smartphones</g:product_type>");
  });

  it("falls back to stripped description and escapes XML", () => {
    const xml = buildFeedItem(base, "https://netereka.ci");
    expect(xml).toContain("<g:description>Super téléphone</g:description>");
  });

  it("uses short_description when present", () => {
    const xml = buildFeedItem({ ...base, shortDescription: "Court & net" }, "https://netereka.ci");
    expect(xml).toContain("<g:description>Court &amp; net</g:description>");
  });

  it("emits sale_price when compare_price is higher than base_price", () => {
    const xml = buildFeedItem({ ...base, comparePrice: 600000 }, "https://netereka.ci");
    expect(xml).toContain("<g:price>600000 XOF</g:price>");
    expect(xml).toContain("<g:sale_price>530000 XOF</g:sale_price>");
  });

  it("does NOT emit sale_price when compare_price <= base_price", () => {
    const xml = buildFeedItem({ ...base, comparePrice: 530000 }, "https://netereka.ci");
    expect(xml).not.toContain("sale_price");
    expect(xml).toContain("<g:price>530000 XOF</g:price>");
  });

  it("marks out_of_stock when quantity is 0", () => {
    const xml = buildFeedItem({ ...base, stockQuantity: 0 }, "https://netereka.ci");
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  it("emits identifier_exists=no when both brand and sku are absent", () => {
    const xml = buildFeedItem({ ...base, brand: null, sku: null }, "https://netereka.ci");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xml).not.toContain("<g:brand>");
    expect(xml).not.toContain("<g:mpn>");
  });

  it("omits google_product_category for an unmapped category", () => {
    const xml = buildFeedItem({ ...base, categorySlug: "inconnu", parentCategorySlug: null }, "https://netereka.ci");
    expect(xml).not.toContain("google_product_category");
  });

  it("truncates the title to 150 characters", () => {
    const longName = "X".repeat(200);
    const xml = buildFeedItem({ ...base, name: longName }, "https://netereka.ci");
    const match = xml.match(/<g:title>([^<]*)<\/g:title>/);
    expect(match?.[1].length).toBe(150);
  });
});
