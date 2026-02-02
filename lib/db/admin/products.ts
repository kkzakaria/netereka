import { query, queryFirst } from "@/lib/db";
import type {
  Product,
  ProductDetail,
  ProductImage,
  ProductVariant,
} from "@/lib/db/types";

export interface AdminProductFilters {
  search?: string;
  categoryId?: string;
  status?: "active" | "inactive" | "all";
  sort?: "newest" | "oldest" | "name" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}

export async function getAdminProducts(
  opts: AdminProductFilters = {}
): Promise<Product[]> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }
  if (opts.categoryId) {
    conditions.push("p.category_id = ?");
    params.push(opts.categoryId);
  }
  if (opts.status === "active") {
    conditions.push("p.is_active = 1");
  } else if (opts.status === "inactive") {
    conditions.push("p.is_active = 0");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "p.created_at DESC";
  switch (opts.sort) {
    case "oldest":
      orderBy = "p.created_at ASC";
      break;
    case "name":
      orderBy = "p.name ASC";
      break;
    case "price_asc":
      orderBy = "p.base_price ASC";
      break;
    case "price_desc":
      orderBy = "p.base_price DESC";
      break;
  }

  params.push(limit, offset);

  return query<Product>(
    `SELECT p.*,
       (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) as variant_count,
       c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function getAdminProductCount(
  opts: AdminProductFilters = {}
): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    const term = `%${opts.search}%`;
    params.push(term, term, term);
  }
  if (opts.categoryId) {
    conditions.push("p.category_id = ?");
    params.push(opts.categoryId);
  }
  if (opts.status === "active") {
    conditions.push("p.is_active = 1");
  } else if (opts.status === "inactive") {
    conditions.push("p.is_active = 0");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p ${where}`,
    params
  );
  return result?.count ?? 0;
}

export async function getAdminProductById(
  id: string
): Promise<ProductDetail | null> {
  const product = await queryFirst<Product>(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  if (!product) return null;

  const [images, variants] = await Promise.all([
    query<ProductImage>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [product.id]
    ),
    query<ProductVariant>(
      "SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC",
      [product.id]
    ),
  ]);

  return { ...product, images, variants };
}
