import { query, queryFirst, execute } from "@/lib/db";
import { nanoid } from "nanoid";
import type { Review } from "@/lib/db/types";

export async function getProductReviews(
  productId: string,
  limit = 20,
  offset = 0
): Promise<Review[]> {
  return query<Review>(
    `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment,
            r.is_verified_purchase, r.created_at,
            u.name as user_name
     FROM reviews r
     JOIN "user" u ON u.id = r.user_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [productId, limit, offset]
  );
}

export async function getProductRatingStats(
  productId: string
): Promise<{ average: number; count: number }> {
  const row = await queryFirst<{ average: number; count: number }>(
    `SELECT COALESCE(AVG(rating), 0) as average, COUNT(*) as count
     FROM reviews WHERE product_id = ?`,
    [productId]
  );
  return { average: row?.average ?? 0, count: row?.count ?? 0 };
}

export async function getUserReviews(userId: string): Promise<Review[]> {
  return query<Review>(
    `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment,
            r.is_verified_purchase, r.created_at,
            u.name as user_name,
            p.name as product_name, p.slug as product_slug,
            (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as product_image_url
     FROM reviews r
     JOIN "user" u ON u.id = r.user_id
     JOIN products p ON p.id = r.product_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );
}

export async function createReview(data: {
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
}): Promise<string> {
  const id = nanoid();
  await execute(
    `INSERT INTO reviews (id, product_id, user_id, rating, comment, is_verified_purchase)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.productId, data.userId, data.rating, data.comment, data.isVerifiedPurchase ? 1 : 0]
  );
  return id;
}

export async function hasUserReviewedProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  const row = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM reviews WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );
  return (row?.count ?? 0) > 0;
}

export async function canUserReview(
  userId: string,
  productId: string
): Promise<boolean> {
  // User must have purchased the product (delivered order) and not already reviewed
  const hasReviewed = await hasUserReviewedProduct(userId, productId);
  if (hasReviewed) return false;

  const row = await queryFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'`,
    [userId, productId]
  );
  return (row?.count ?? 0) > 0;
}

export async function getReviewableProducts(userId: string): Promise<
  Array<{
    product_id: string;
    product_name: string;
    product_slug: string;
    product_image_url: string | null;
    order_number: string;
    delivered_at: string | null;
  }>
> {
  return query(
    `SELECT DISTINCT oi.product_id, oi.product_name,
            p.slug as product_slug,
            (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as product_image_url,
            o.order_number, o.delivered_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.user_id = ? AND o.status = 'delivered'
       AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = ? AND r.product_id = oi.product_id)
     ORDER BY o.delivered_at DESC`,
    [userId, userId]
  );
}
