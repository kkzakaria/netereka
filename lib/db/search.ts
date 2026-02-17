import { query, queryFirst } from "@/lib/db";
import type { Product, SearchOptions, PriceRange } from "@/lib/db/types";

const BASE_SELECT = `SELECT p.*,
  (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
  (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
  c.name as category_name, c.slug as category_slug
FROM products p
JOIN categories c ON c.id = p.category_id`;

export function buildWhere(opts: SearchOptions): { clause: string; params: unknown[] } {
  const conditions: string[] = ["p.is_active = 1"];
  const params: unknown[] = [];

  if (opts.query) {
    const like = `%${opts.query}%`;
    conditions.push("(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)");
    params.push(like, like, like);
  }

  if (opts.categoryIds && opts.categoryIds.length > 0) {
    const placeholders = opts.categoryIds.map(() => "?").join(", ");
    conditions.push(`p.category_id IN (${placeholders})`);
    params.push(...opts.categoryIds);
  } else if (opts.category) {
    conditions.push("c.slug = ?");
    params.push(opts.category);
  }

  if (opts.brands && opts.brands.length > 0) {
    const placeholders = opts.brands.map(() => "?").join(", ");
    conditions.push(`p.brand IN (${placeholders})`);
    params.push(...opts.brands);
  }

  if (opts.minPrice != null) {
    conditions.push("p.base_price >= ?");
    params.push(opts.minPrice);
  }

  if (opts.maxPrice != null) {
    conditions.push("p.base_price <= ?");
    params.push(opts.maxPrice);
  }

  return { clause: conditions.join(" AND "), params };
}

export function buildOrderBy(sort?: string): string {
  switch (sort) {
    case "price_asc":
      return "ORDER BY p.base_price ASC";
    case "price_desc":
      return "ORDER BY p.base_price DESC";
    case "newest":
      return "ORDER BY p.created_at DESC";
    default:
      return "ORDER BY p.is_featured DESC, p.created_at DESC";
  }
}

export async function searchProducts(opts: SearchOptions): Promise<Product[]> {
  const { clause, params } = buildWhere(opts);
  const orderBy = buildOrderBy(opts.sort);
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  return query<Product>(
    `${BASE_SELECT} WHERE ${clause} ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

export async function countSearchResults(opts: SearchOptions): Promise<number> {
  const { clause, params } = buildWhere(opts);
  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p JOIN categories c ON c.id = p.category_id WHERE ${clause}`,
    params
  );
  return result?.count ?? 0;
}

export async function getBrandsInCategory(categoryIds: string | string[]): Promise<string[]> {
  const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await query<{ brand: string }>(
    `SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL AND category_id IN (${placeholders}) ORDER BY brand`,
    ids
  );
  return rows.map((r) => r.brand);
}

export async function getPriceRangeInCategory(categoryIds: string | string[]): Promise<PriceRange> {
  const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  if (ids.length === 0) return { min: 0, max: 0 };
  const placeholders = ids.map(() => "?").join(", ");
  const result = await queryFirst<{ min_price: number; max_price: number }>(
    `SELECT MIN(base_price) as min_price, MAX(base_price) as max_price FROM products WHERE is_active = 1 AND category_id IN (${placeholders})`,
    ids
  );
  return { min: result?.min_price ?? 0, max: result?.max_price ?? 0 };
}

export async function getBrandsInUse(): Promise<string[]> {
  const rows = await query<{ brand: string }>(
    "SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL ORDER BY brand"
  );
  return rows.map((r) => r.brand);
}

export async function getPriceRange(): Promise<PriceRange> {
  const result = await queryFirst<{ min_price: number; max_price: number }>(
    "SELECT MIN(base_price) as min_price, MAX(base_price) as max_price FROM products WHERE is_active = 1"
  );
  return { min: result?.min_price ?? 0, max: result?.max_price ?? 0 };
}
