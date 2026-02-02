import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { ImageGallery } from "@/components/storefront/image-gallery";
import { VariantSelector } from "@/components/storefront/variant-selector";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { StarRating } from "@/components/storefront/star-rating";
import { SITE_NAME } from "@/lib/utils/constants";
import { formatPrice, formatDate } from "@/lib/utils/format";
import { getOptionalSession } from "@/lib/auth/guards";
import { isInWishlist } from "@/lib/db/wishlist";
import { getProductReviews, getProductRatingStats } from "@/lib/db/reviews";

const getProductCached = cache(getProductBySlug);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductCached(slug);
  if (!product) return {};
  return {
    title: `${product.name} | ${SITE_NAME}`,
    description:
      product.short_description ??
      `${product.name} - ${formatPrice(product.base_price)}`,
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
        products={related}
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
  const [reviews, stats] = await Promise.all([
    getProductReviews(productId, 10),
    getProductRatingStats(productId),
  ]);

  if (stats.count === 0) return null;

  return (
    <div className="mt-12 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Avis clients</h2>
        <div className="flex items-center gap-1.5">
          <StarRating value={Math.round(stats.average)} readonly />
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
  const [product, session] = await Promise.all([
    getProductCached(slug),
    getOptionalSession(),
  ]);
  if (!product) notFound();

  const wishlisted = session
    ? await isInWishlist(session.user.id, product.id)
    : false;

  return (
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

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <ImageGallery images={product.images} />

        {/* Product info */}
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
            {session && (
              <WishlistButton productId={product.id} isWishlisted={wishlisted} />
            )}
          </div>

          {product.variants.length > 0 ? (
            <VariantSelector
              variants={product.variants}
              basePrice={product.base_price}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                imageUrl: product.image_url ?? product.images[0]?.url ?? null,
              }}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-2xl font-bold">
                {formatPrice(product.base_price)}
              </p>
              <AddToCartButton
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
            </div>
          )}

          {product.description ? (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reviews */}
      <Suspense fallback={null}>
        <ProductReviews productId={product.id} />
      </Suspense>

      {/* Related */}
      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedProducts
          productId={product.id}
          categoryId={product.category_id}
          categorySlug={product.category_slug}
        />
      </Suspense>
    </div>
  );
}
