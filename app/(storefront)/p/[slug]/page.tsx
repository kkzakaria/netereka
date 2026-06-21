import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProductBySlug, getRelatedProducts, toProductCardData } from "@/lib/db/products";
import { ImageGallery } from "@/components/storefront/image-gallery";
import { getImageUrl } from "@/lib/utils/images";
import { ProductGalleryWithVariants } from "@/components/storefront/product-gallery-with-variants";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { WhatsAppProductButton } from "@/components/storefront/whatsapp-product-button";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { WishlistButtonDynamic } from "@/components/storefront/wishlist-button-dynamic";
import { ProductDetails } from "@/components/storefront/product-details";
import { StarRating } from "@/components/storefront/star-rating";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";
import { formatPrice, formatDate } from "@/lib/utils/format";
import { getProductReviews, getProductRatingStats } from "@/lib/db/reviews";

export const revalidate = 3600;

const getProductCached = cache(getProductBySlug);

// SQLite stores timestamps as "YYYY-MM-DD HH:MM:SS" (UTC), which is not strict ISO 8601.
// schema.org datePublished wants ISO 8601 — normalize, and drop the value if unparseable.
function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductCached(slug);
  if (!product) return { title: "Produit non trouvé" };

  const price = formatPrice(product.base_price);
  const description =
    product.short_description ??
    `Achetez ${product.name} en Côte d'Ivoire. ${price}. Livraison rapide à Abidjan. Paiement à la livraison.`;
  const images = product.images
    .filter((img) => img.url)
    .map((img) => ({
      url: img.url,
      width: 800,
      height: 800,
      alt: img.alt || product.name,
    }));

  return {
    title: `${product.name} - ${price}`,
    description,
    openGraph: {
      title: `${product.name} - ${price} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/p/${slug}`,
      siteName: SITE_NAME,
      images,
      locale: "fr_CI",
      type: "website",
    },
    alternates: {
      canonical: `/p/${slug}`,
    },
  };
}

async function RelatedProducts({
  productId,
  categoryId,
  categorySlug,
}: {
  productId: string;
  categoryId: string;
  categorySlug?: string | null;
}) {
  const related = await getRelatedProducts(productId, categoryId, 8);
  if (related.length === 0) return null;

  return (
    <div className="mt-12">
      <HorizontalSection
        title="Produits similaires"
        href={categorySlug ? `/c/${categorySlug}` : undefined}
        products={related.map(toProductCardData)}
      />
    </div>
  );
}

function RelatedProductsSkeleton() {
  return (
    <div className="mt-12 space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-[160px] shrink-0 sm:w-[200px]"
          >
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function ProductReviews({ productId }: { productId: string }) {
  const [ratingStats, reviews] = await Promise.all([
    getProductRatingStats(productId),
    getProductReviews(productId, 10),
  ]);
  if (ratingStats.count === 0) return null;
  const stats = ratingStats;

  return (
    <div className="mt-12 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Avis clients</h2>
        <div className="flex items-center gap-1.5">
          <StarRating value={Math.round(stats.average)} readonly />
          <span className="text-sm font-medium">{stats.average.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            ({stats.count} avis)
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{review.user_name}</span>
                <StarRating value={review.rating} readonly size="sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(review.created_at)}
              </span>
            </div>
            {review.comment && (
              <p className="mt-1.5 text-sm text-muted-foreground">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductCached(slug);
  if (!product) notFound();

  // Rating stats power the aggregateRating snippet. getProductRatingStats is React-cached,
  // so this call is shared with the <ProductReviews> component below (no extra query).
  // We only fetch review bodies when reviews actually exist — never fabricate ratings
  // (fake review structured data violates Google policy and risks a manual action).
  const ratingStats = await getProductRatingStats(product.id);
  const schemaReviews = ratingStats.count > 0 ? await getProductReviews(product.id, 5) : [];

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 60);
  const priceValidUntil = validUntil.toISOString().split("T")[0];

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.filter((img) => img.url).map((img) => img.url),
    description: product.short_description ?? (product.description_type === "html" ? undefined : product.description),
    ...(product.sku && { sku: product.sku }),
    ...(product.brand && {
      brand: { "@type": "Brand", name: product.brand },
    }),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/p/${slug}`,
      priceCurrency: "XOF",
      price: product.base_price,
      priceValidUntil,
      availability:
        product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
      // 48h to report a defect/non-conformity (CGV §7). Mirrors the return policy
      // declared to Google Merchant Center (/conditions-generales#retours) for consistency.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "CI",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 2,
        returnMethod: "https://schema.org/ReturnInStore",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        // In-house fleet, fee varies by commune (Plateau 1 000 → 3 000 XOF). Advertise the floor.
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 1000,
          currency: "XOF",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "CI",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
      },
    },
    // Only emitted when real reviews exist — see schemaReviews guard above.
    ...(ratingStats.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.round(ratingStats.average * 10) / 10,
        reviewCount: ratingStats.count,
        bestRating: 5,
        worstRating: 1,
      },
      review: schemaReviews.map((r) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        author: { "@type": "Person", name: r.user_name },
        ...(toIsoDate(r.created_at) && { datePublished: toIsoDate(r.created_at) }),
        ...(r.comment && { reviewBody: r.comment }),
      })),
    }),
  };

  const comparePrice = product.compare_price;
  const hasDiscount = comparePrice != null && comparePrice > product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - product.base_price) / comparePrice) * 100)
    : 0;
  const isOutOfStock = product.stock_quantity <= 0;

  const breadcrumbItems = [
    { name: "Accueil", href: "/" },
    ...(product.category_slug && product.category_name
      ? [{ name: product.category_name, href: `/c/${product.category_slug}` }]
      : []),
    { name: product.name },
  ];

  return (
    <>
      <JsonLd data={productSchema} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <span className="mx-1.5">/</span>
          {product.category_slug ? (
            <>
              <Link
                href={`/c/${product.category_slug}`}
                className="hover:text-foreground"
              >
                {product.category_name}
              </Link>
              <span className="mx-1.5">/</span>
            </>
          ) : null}
          <span className="text-foreground">{product.name}</span>
        </nav>

        {product.variants.length > 0 ? (
          <ProductGalleryWithVariants
            images={product.images}
            variants={product.variants}
            basePrice={product.base_price}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.image_url ?? product.images[0]?.url ?? null,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {product.brand ? (
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {product.brand}
                  </span>
                ) : null}
                <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
              </div>
              <WishlistButtonDynamic productId={product.id} />
            </div>
          </ProductGalleryWithVariants>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <ImageGallery images={product.images}>
              <Image
                src={getImageUrl(product.images[0]?.url)}
                alt={product.images[0]?.alt || product.name}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
              />
            </ImageGallery>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {product.brand ? (
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {product.brand}
                    </span>
                  ) : null}
                  <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
                </div>
                <WishlistButtonDynamic productId={product.id} />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold">
                      {formatPrice(product.base_price)}
                    </p>
                    {hasDiscount && (
                      <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-white">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(comparePrice)}
                    </p>
                  )}
                </div>
                {isOutOfStock && (
                  <p className="text-sm font-medium text-destructive">Rupture de stock</p>
                )}
                <AddToCartButton
                  disabled={isOutOfStock}
                  item={{
                    productId: product.id,
                    variantId: null,
                    name: product.name,
                    variantName: null,
                    price: product.base_price,
                    imageUrl: product.image_url ?? product.images[0]?.url ?? null,
                    slug: product.slug,
                  }}
                />
                <WhatsAppProductButton
                  productName={product.name}
                  price={product.base_price}
                  slug={product.slug}
                  variant="full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <ProductDetails
          tagline={product.tagline}
          highlights={product.highlights}
          featureBlocks={product.feature_blocks}
          faq={product.faq}
          description={product.description}
          descriptionType={product.description_type}
          productId={product.id}
          attributes={product.attributes}
        />

        {/* Reviews */}
        <Suspense fallback={null}>
          <ProductReviews productId={product.id} />
        </Suspense>

        {/* Related */}
        <Suspense fallback={<RelatedProductsSkeleton />}>
          <RelatedProducts
            productId={product.id}
            categoryId={product.category_id ?? ""}
            categorySlug={product.category_slug}
          />
        </Suspense>
      </div>
    </>
  );
}
