import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/db/categories";
import {
  getProductsByCategory,
  getProductCountByCategory,
} from "@/lib/db/products";
import { ProductGrid } from "@/components/storefront/product-grid";
import { LoadMoreButton } from "./load-more-button";
import { SITE_NAME } from "@/lib/utils/constants";

const getCategoryCached = cache(getCategoryBySlug);

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryCached(slug);
  if (!category) return {};
  return {
    title: `${category.name} | ${SITE_NAME}`,
    description: category.description ?? `Découvrez notre sélection de ${category.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const category = await getCategoryCached(slug);
  if (!category) notFound();

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const [products, total] = await Promise.all([
    getProductsByCategory(category.id, { limit, offset }),
    getProductCountByCategory(category.id),
  ]);

  const hasMore = offset + products.length < total;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {total} produit{total > 1 ? "s" : ""}
        </p>
      </div>

      <ProductGrid products={products} />

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <LoadMoreButton slug={slug} nextPage={currentPage + 1} />
        </div>
      )}
    </div>
  );
}
