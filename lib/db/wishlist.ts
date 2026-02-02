import { query, queryFirst, execute } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { WishlistItem } from "@/lib/db/types";

export async function getUserWishlist(userId: string): Promise<WishlistItem[]> {
  return query<WishlistItem>(
    `SELECT w.id, w.product_id, w.created_at,
            p.name, p.slug, p.base_price, p.compare_price, p.brand,
            p.stock_quantity, p.is_active,
            (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url,
            c.name as category_name
     FROM wishlist w
     JOIN products p ON p.id = w.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId]
  );
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const id = nanoid();
  await execute(
    "INSERT OR IGNORE INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)",
    [id, userId, productId]
  );
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await execute(
    "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const row = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM wishlist WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
  return (row?.count ?? 0) > 0;
}

export async function atomicToggleWishlist(userId: string, productId: string): Promise<boolean> {
  const db = await getDB();
  const id = nanoid();
  // Batch: delete then insert — both run atomically in a single round-trip
  const [delResult] = await db.batch([
    db.prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?").bind(userId, productId),
    db.prepare("INSERT OR IGNORE INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)").bind(id, userId, productId),
  ]);
  if (delResult.meta.changes > 0) {
    // It existed and was deleted; the INSERT created a new row — remove it
    await db.prepare("DELETE FROM wishlist WHERE id = ?").bind(id).run();
    return false; // was removed
  }
  // Didn't exist before, INSERT added it
  return true; // was added
}

export async function getUserWishlistProductIds(userId: string): Promise<Set<string>> {
  const rows = await query<{ product_id: string }>(
    "SELECT product_id FROM wishlist WHERE user_id = ?",
    [userId]
  );
  return new Set(rows.map((r) => r.product_id));
}
