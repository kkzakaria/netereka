"use server";

import { z } from "zod";
import { query } from "@/lib/db";
import type { ProductVariant } from "@/lib/db/types";

const productIdSchema = z.string().min(1).max(50);

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return [];

  return query<ProductVariant>(
    "SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC, price ASC",
    [parsed.data]
  );
}
