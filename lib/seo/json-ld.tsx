import type { ProductDetail, Review } from "@/lib/db/types";
import { SITE_NAME, SITE_URL, CURRENCY } from "@/lib/utils/constants";
import { getImageUrl } from "@/lib/utils/images";

// Generic JSON-LD component
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization schema for the homepage
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "Votre boutique électronique en Côte d'Ivoire. Livraison à Abidjan.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Abidjan",
          addressCountry: "CI",
        },
      }}
    />
  );
}

// WebSite schema with search action
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

// Product schema with offers and reviews
export function ProductJsonLd({
  product,
  reviews,
  ratingStats,
}: {
  product: ProductDetail;
  reviews: Review[];
  ratingStats: { average: number; count: number };
}) {
  const images = product.images.map((img) => getImageUrl(img.url));
  const inStock = product.stock_quantity > 0;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.short_description || product.name,
    image: images.length > 0 ? images : undefined,
    sku: product.sku || product.id,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    offers: {
      "@type": "Offer",
      price: product.base_price,
      priceCurrency: CURRENCY,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/p/${product.slug}`,
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };

  if (ratingStats.count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingStats.average.toFixed(1),
      reviewCount: ratingStats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews.length > 0) {
    data.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.user_name || "Client" },
      datePublished: r.created_at,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.comment || undefined,
    }));
  }

  return <JsonLd data={data} />;
}

// BreadcrumbList schema
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url?: string }>;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url ? `${SITE_URL}${item.url}` : undefined,
        })),
      }}
    />
  );
}
