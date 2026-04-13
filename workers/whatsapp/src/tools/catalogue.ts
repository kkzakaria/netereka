import type { ToolContext, ToolResult } from "../types";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  stock_quantity: number;
  brand: string | null;
  image_url: string | null;
}

interface ProductDetailRow extends ProductRow {
  short_description: string | null;
  category_name: string | null;
}

interface VariantRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

export async function searchProducts(
  ctx: ToolContext,
  params: { query: string; category_slug?: string; limit?: number }
): Promise<ToolResult & { data: unknown[] }> {
  const limit = Math.min(params.limit ?? 5, 10);
  const searchTerm = `%${params.query}%`;

  let sql = `
    SELECT p.id, p.name, p.slug, p.base_price, p.stock_quantity, p.brand,
           (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url
    FROM products p
    WHERE p.is_active = 1 AND p.is_draft = 0
      AND (p.name LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ?)
  `;
  const bindings: unknown[] = [searchTerm, searchTerm, searchTerm];

  if (params.category_slug) {
    sql += ` AND p.category_id = (SELECT id FROM categories WHERE slug = ?)`;
    bindings.push(params.category_slug);
  }

  sql += ` ORDER BY p.is_featured DESC, p.stock_quantity DESC LIMIT ?`;
  bindings.push(limit);

  const { results } = await ctx.db
    .prepare(sql)
    .bind(...bindings)
    .all<ProductRow>();

  const data = results.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.base_price,
    brand: p.brand,
    in_stock: p.stock_quantity > 0,
  }));

  return { success: true, data };
}

export async function getProduct(
  ctx: ToolContext,
  params: { slug: string }
): Promise<ToolResult & { data?: unknown }> {
  const product = await ctx.db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.base_price, p.stock_quantity, p.brand, p.short_description,
              c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_active = 1`
    )
    .bind(params.slug)
    .first<ProductDetailRow>();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { results: variants } = await ctx.db
    .prepare(
      `SELECT id, name, price, stock_quantity
       FROM product_variants
       WHERE product_id = ? AND is_active = 1
       ORDER BY sort_order`
    )
    .bind(product.id)
    .all<VariantRow>();

  return {
    success: true,
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      brand: product.brand,
      description: product.short_description,
      category: product.category_name,
      in_stock: product.stock_quantity > 0,
      stock_quantity: product.stock_quantity,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        in_stock: v.stock_quantity > 0,
      })),
    },
  };
}

export async function getCategories(
  ctx: ToolContext,
  params: { parent_slug?: string }
): Promise<ToolResult & { data: unknown[] }> {
  let sql: string;
  const bindings: unknown[] = [];

  if (params.parent_slug) {
    sql = `
      SELECT c.id, c.name, c.slug,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1 AND c.parent_id = (SELECT id FROM categories WHERE slug = ?)
      ORDER BY c.sort_order
    `;
    bindings.push(params.parent_slug);
  } else {
    sql = `
      SELECT c.id, c.name, c.slug,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1 AND c.parent_id IS NULL
      ORDER BY c.sort_order
    `;
  }

  const { results } = await ctx.db.prepare(sql).bind(...bindings).all<CategoryRow>();

  return {
    success: true,
    data: results.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      product_count: c.product_count,
    })),
  };
}
