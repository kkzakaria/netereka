"use server";

import { z } from "zod";
import { getOptionalSession } from "@/lib/auth/guards";
import { getKV } from "@/lib/cloudflare/context";
import type { CartItem } from "@/lib/types/cart";
import { cartItemKey } from "@/lib/types/cart";

const CART_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_QUANTITY = 10;
const MAX_CART_ITEMS = 50;

const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable(),
  name: z.string(),
  variantName: z.string().nullable(),
  price: z.number().nonnegative(),
  imageUrl: z.string().nullable(),
  slug: z.string(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

const cartSchema = z.array(cartItemSchema).max(MAX_CART_ITEMS);

function cartKey(userId: string) {
  return `cart:${userId}`;
}

async function getSessionUserId(): Promise<string | null> {
  const session = await getOptionalSession();
  return session?.user?.id ?? null;
}

/**
 * Merge local cart items with server-side KV cart.
 * Returns the merged cart to update the client store.
 */
export async function syncCart(
  localItems: CartItem[]
): Promise<CartItem[]> {
  const userId = await getSessionUserId();
  if (!userId) return localItems;

  // Validate local items from the client
  const parsedLocal = cartSchema.safeParse(localItems);
  const validLocalItems = parsedLocal.success ? parsedLocal.data : [];

  const kv = await getKV();
  const stored = await kv.get(cartKey(userId), "json");

  // Validate stored KV data
  const parsedStored = cartSchema.safeParse(stored);
  const serverItems = parsedStored.success ? parsedStored.data : [];

  // Build map from server items
  const merged = new Map<string, CartItem>();
  for (const item of serverItems) {
    merged.set(cartItemKey(item), item);
  }

  // Merge local items: add quantities for duplicates
  for (const item of validLocalItems) {
    const key = cartItemKey(item);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...item,
        quantity: Math.min(existing.quantity + item.quantity, MAX_QUANTITY),
      });
    } else {
      merged.set(key, item);
    }
  }

  // Enforce max cart items
  const result = Array.from(merged.values()).slice(0, MAX_CART_ITEMS);

  // Persist merged cart
  await kv.put(cartKey(userId), JSON.stringify(result), {
    expirationTtl: CART_TTL,
  });

  return result;
}

/**
 * Save the full cart to KV. Called on every cart mutation (debounced).
 */
export async function saveCart(items: CartItem[]): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  // Validate before persisting
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return;

  const kv = await getKV();
  await kv.put(cartKey(userId), JSON.stringify(parsed.data), {
    expirationTtl: CART_TTL,
  });
}

/**
 * Clear the server-side cart. Called on checkout or explicit clear.
 */
export async function clearServerCart(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  const kv = await getKV();
  await kv.delete(cartKey(userId));
}
