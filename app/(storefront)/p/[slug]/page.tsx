import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { ImageGallery } from "@/components/storefront/image-gallery";
import { VariantSelector } from "@/components/storefront/variant-selector";
import { HorizontalSection } from "@/components/storefront/horizontal-section";
import { SITE_NAME } from "@/lib/utils/constants";
import { formatPrice } from "@/lib/utils/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} | ${SITE_NAME}`,
    description:
      product.short_description ??
      `${product.name} - ${formatPrice(product.base_price)}`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(
    product.id,
    product.category_id,
    8
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Accueil
        </Link>
        <span className="mx-1.5">/</span>
        {product.category_slug && (
          <>
            <Link
              href={`/c/${product.category_slug}`}
              className="hover:text-foreground"
            >
              {product.category_name}
            </Link>
            <span className="mx-1.5">/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <ImageGallery images={product.images} />

        {/* Product info */}
        <div className="space-y-4">
          {product.brand && (
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {product.brand}
            </span>
          )}
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>

          {product.variants.length > 0 ? (
            <VariantSelector
              variants={product.variants}
              basePrice={product.base_price}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-2xl font-bold">
                {formatPrice(product.base_price)}
              </p>
              <button
                disabled
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-50"
              >
                Ajouter au panier
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Bientôt disponible
              </p>
            </div>
          )}

          {product.description && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <HorizontalSection
            title="Produits similaires"
            href={product.category_slug ? `/c/${product.category_slug}` : undefined}
            products={related}
          />
        </div>
      )}
    </div>
  );
}
