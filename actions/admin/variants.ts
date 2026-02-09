"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute } from "@/lib/db";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

const variantSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().optional().default(""),
  price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  attributes: z
    .string()
    .default("{}")
    .refine(
      (val) => {
        try {
          const obj = JSON.parse(val);
          return typeof obj === "object" && obj !== null && !Array.isArray(obj);
        } catch {
          return false;
        }
      },
      { message: "Attributs JSON invalides" }
    ),
  is_active: z.coerce.number().min(0).max(1).default(1),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export async function createVariant(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const id = nanoid();

  await execute(
    `INSERT INTO product_variants (id, product_id, name, sku, price, compare_price, stock_quantity, attributes, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      productId,
      data.name,
      data.sku || null,
      data.price,
      data.compare_price ?? null,
      data.stock_quantity,
      data.attributes,
      data.is_active,
      data.sort_order,
    ]
  );

  revalidatePath(`/products/${productId}/edit`);
  return { success: true, id };
}

export async function updateVariant(
  variantId: string,
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const vidResult = idSchema.safeParse(variantId);
  const pidResult = idSchema.safeParse(productId);
  if (!vidResult.success || !pidResult.success) {
    return { success: false, error: "ID invalide" };
  }

  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;

  await execute(
    `UPDATE product_variants SET
       name = ?, sku = ?, price = ?, compare_price = ?, stock_quantity = ?,
       attributes = ?, is_active = ?, sort_order = ?
     WHERE id = ? AND product_id = ?`,
    [
      data.name,
      data.sku || null,
      data.price,
      data.compare_price ?? null,
      data.stock_quantity,
      data.attributes,
      data.is_active,
      data.sort_order,
      variantId,
      productId,
    ]
  );

  revalidatePath(`/products/${productId}/edit`);
  return { success: true, id: variantId };
}

export async function deleteVariant(
  variantId: string,
  productId: string
): Promise<ActionResult> {
  await requireAdmin();

  const vidResult = idSchema.safeParse(variantId);
  const pidResult = idSchema.safeParse(productId);
  if (!vidResult.success || !pidResult.success) {
    return { success: false, error: "ID invalide" };
  }

  await execute("DELETE FROM product_variants WHERE id = ? AND product_id = ?", [
    variantId,
    productId,
  ]);
  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}
