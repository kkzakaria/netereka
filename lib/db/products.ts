import { query, queryFirst } from "@/lib/db";
import type { Product, ProductCardData, ProductAttribute, ProductDetail, ProductImage, ProductVariant } from "@/lib/db/types";
import { hydrateProductStoryFields, type ProductWithRawStory } from "@/lib/utils/product-story";

export async function getProductsByCategory(
  categoryId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<Product[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const rows = await query<ProductWithRawStory>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.is_active = 1
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    [categoryId, limit, offset]
  );
  return rows.map(hydrateProductStoryFields);
}

export async function getProductCountByCategory(categoryId: string): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1",
    [categoryId]
  );
  return result?.count ?? 0;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await queryFirst<ProductWithRawStory>(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.is_active = 1`,
    [slug]
  );
  if (!product) return null;

  const [images, variants, attributes] = await Promise.all([
    query<ProductImage>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [product.id]
    ),
    query<ProductVariant>(
      "SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY price ASC",
      [product.id]
    ),
    query<ProductAttribute>(
      "SELECT * FROM product_attributes WHERE product_id = ? ORDER BY name ASC",
      [product.id]
    ),
  ]);

  return { ...hydrateProductStoryFields(product), images, variants, attributes };
}

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  const rows = await query<ProductWithRawStory>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_featured = 1 AND p.is_active = 1
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(hydrateProductStoryFields);
}

export async function getLatestProducts(limit = 10, excludeFeatured = false): Promise<Product[]> {
  const featuredFilter = excludeFeatured ? "AND p.is_featured = 0" : "";
  const rows = await query<ProductWithRawStory>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1 ${featuredFilter}
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(hydrateProductStoryFields);
}

export async function getProductsByCategorySlug(
  categorySlug: string,
  limit = 10
): Promise<Product[]> {
  const rows = await query<ProductWithRawStory>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = ? AND p.is_active = 1
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT ?`,
    [categorySlug, limit]
  );
  return rows.map(hydrateProductStoryFields);
}

/** Strip a Product to only the fields needed by client-side cards. */
export function toProductCardData(p: Product): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    base_price: p.base_price,
    compare_price: p.compare_price,
    brand: p.brand,
    is_featured: p.is_featured,
    stock_quantity: p.stock_quantity,
    image_url: p.image_url,
    category_name: p.category_name,
    variant_count: p.variant_count,
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 8
): Promise<Product[]> {
  const rows = await query<ProductWithRawStory>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [categoryId, productId, limit]
  );
  return rows.map(hydrateProductStoryFields);
}

export interface FeedRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  description_type: string;
  short_description: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  brand: string | null;
  stock_quantity: number;
  category_slug: string | null;
  category_name: string | null;
  parent_category_slug: string | null;
  image_urls: string[];
}

/** All active, non-draft products with their images (primary first), for the
 *  Google Merchant Center feed. Out-of-stock products are included. */
export async function getProductsForFeed(): Promise<FeedRow[]> {
  const products = await query<Omit<FeedRow, "image_urls">>(
    `SELECT p.id, p.slug, p.name, p.description, p.description_type, p.short_description,
            p.base_price, p.compare_price, p.sku, p.brand, p.stock_quantity,
            c.slug AS category_slug, c.name AS category_name,
            pc.slug AS parent_category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE p.is_active = 1 AND p.is_draft = 0
      ORDER BY p.created_at DESC`
  );

  const images = await query<{ product_id: string; url: string | null }>(
    `SELECT pi.product_id, pi.url
       FROM product_images pi
       JOIN products p ON p.id = pi.product_id
      WHERE p.is_active = 1 AND p.is_draft = 0 AND pi.variant_id IS NULL
      ORDER BY pi.product_id, pi.is_primary DESC, pi.sort_order ASC`
  );

  const byProduct = new Map<string, string[]>();
  for (const img of images) {
    if (!img.url) continue;
    const arr = byProduct.get(img.product_id) ?? [];
    arr.push(img.url);
    byProduct.set(img.product_id, arr);
  }

  return products.map((p) => ({ ...p, image_urls: byProduct.get(p.id) ?? [] }));
}
