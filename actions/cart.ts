"use server";

import type { CartItem } from "@/lib/types/cart";

const CART_TTL = 60 * 60 * 24 * 7; // 7 days

function getKV(): KVNamespace {
  return (process.env as unknown as { CART_KV: KVNamespace }).CART_KV;
}

export async function syncCartToKV(userId: string, items: CartItem[]) {
  const kv = getKV();
  await kv.put(`cart:${userId}`, JSON.stringify(items), {
    expirationTtl: CART_TTL,
  });
}

export async function getCartFromKV(userId: string): Promise<CartItem[]> {
  const kv = getKV();
  const raw = await kv.get(`cart:${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function mergeCartFromKV(
  userId: string,
  localItems: CartItem[]
): Promise<CartItem[]> {
  const kvItems = await getCartFromKV(userId);
  const merged = new Map<string, CartItem>();

  // KV items first (lower priority)
  for (const item of kvItems) {
    merged.set(`${item.productId}:${item.variantId ?? "default"}`, item);
  }
  // Local items override (higher priority — more recent)
  for (const item of localItems) {
    const key = `${item.productId}:${item.variantId ?? "default"}`;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, { ...item, quantity: Math.max(item.quantity, existing.quantity) });
    } else {
      merged.set(key, item);
    }
  }

  const result = [...merged.values()];
  await syncCartToKV(userId, result);
  return result;
}
