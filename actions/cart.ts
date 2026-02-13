"use server";

import { headers } from "next/headers";
import { initAuth } from "@/lib/auth";
import { getKV } from "@/lib/cloudflare/context";
import type { CartItem } from "@/lib/types/cart";
import { cartItemKey } from "@/lib/types/cart";

const CART_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_QUANTITY = 10;

function cartKey(userId: string) {
  return `cart:${userId}`;
}

async function getSessionUserId(): Promise<string | null> {
  const auth = await initAuth();
  const session = await auth.api.getSession({ headers: await headers() });
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

  const kv = await getKV();
  const stored = await kv.get(cartKey(userId), "json") as CartItem[] | null;
  const serverItems = stored ?? [];

  // Build map from server items
  const merged = new Map<string, CartItem>();
  for (const item of serverItems) {
    merged.set(cartItemKey(item), item);
  }

  // Merge local items: add quantities for duplicates
  for (const item of localItems) {
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

  const result = Array.from(merged.values());

  // Persist merged cart
  await kv.put(cartKey(userId), JSON.stringify(result), {
    expirationTtl: CART_TTL,
  });

  return result;
}

/**
 * Save the full cart to KV. Called on every cart mutation.
 */
export async function saveCart(items: CartItem[]): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  const kv = await getKV();
  await kv.put(cartKey(userId), JSON.stringify(items), {
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
