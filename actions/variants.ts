"use server";

import { z } from "zod";
import { query } from "@/lib/db";
import type { ProductVariant } from "@/lib/db/types";

const productIdSchema = z.string().min(1).max(50);

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return [];

  try {
    return await query<ProductVariant>(
      "SELECT id, product_id, name, sku, price, compare_price, stock_quantity, attributes, is_active, sort_order FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC, price ASC",
      [parsed.data]
    );
  } catch (err) {
    console.error("[variants] getProductVariants failed for product", productId, err);
    throw err;
  }
}
