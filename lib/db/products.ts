import { query, queryFirst } from "@/lib/db";
import type { Product, ProductAttribute, ProductDetail, ProductImage, ProductVariant } from "@/lib/db/types";

export async function getProductsByCategory(
  categoryId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<Product[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  return query<Product>(
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
}

export async function getProductCountByCategory(categoryId: string): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1",
    [categoryId]
  );
  return result?.count ?? 0;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await queryFirst<Product>(
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

  return { ...product, images, variants, attributes };
}

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  return query<Product>(
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
}

export async function getLatestProducts(limit = 10, excludeFeatured = false): Promise<Product[]> {
  const featuredFilter = excludeFeatured ? "AND p.is_featured = 0" : "";
  return query<Product>(
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
}

export async function getProductsByCategorySlug(
  categorySlug: string,
  limit = 10
): Promise<Product[]> {
  return query<Product>(
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
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 8
): Promise<Product[]> {
  return query<Product>(
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
}
