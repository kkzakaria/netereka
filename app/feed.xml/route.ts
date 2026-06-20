import { getProductsForFeed } from "@/lib/db/products";
import { absolutize, buildFeed, buildFeedItem, type FeedProduct } from "@/lib/seo/merchant-feed";
import { getImageUrl } from "@/lib/utils/images";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/utils/constants";

// Rendered at request time so the D1 binding (getCloudflareContext) is available.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getProductsForFeed();
    const items: string[] = [];
    let skippedNoImage = 0;
    let skippedNoPrice = 0;

    for (const r of rows) {
      if (r.base_price <= 0) {
        skippedNoPrice++;
        continue;
      }

      const images = r.image_urls
        .map((u) => absolutize(getImageUrl(u), SITE_URL))
        .filter((u) => u.length > 0);

      if (images.length === 0) {
        skippedNoImage++;
        continue;
      }

      const product: FeedProduct = {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        descriptionType: r.description_type,
        shortDescription: r.short_description,
        basePrice: r.base_price,
        comparePrice: r.compare_price,
        sku: r.sku,
        brand: r.brand,
        stockQuantity: r.stock_quantity,
        categorySlug: r.category_slug,
        categoryName: r.category_name,
        parentCategorySlug: r.parent_category_slug,
        primaryImage: images[0],
        additionalImages: images.slice(1, 11),
      };

      items.push(buildFeedItem(product, SITE_URL));
    }

    if (skippedNoImage > 0) {
      console.warn(`[feed] ${skippedNoImage} produit(s) sans image exclu(s) du flux Merchant Center`);
    }
    if (skippedNoPrice > 0) {
      console.warn(`[feed] ${skippedNoPrice} produit(s) sans prix valide (<= 0) exclu(s) du flux Merchant Center`);
    }

    const xml = buildFeed(items, {
      siteUrl: SITE_URL,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    });

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Public read-only feed: allow cross-origin readers (e.g. Merchant Center's
        // in-browser URL validator does a fetch() from merchants.google.com).
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    // Never serve a partial feed: a 500 makes Merchant Center keep the last good feed.
    console.error("[feed] failed to build Merchant Center feed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
