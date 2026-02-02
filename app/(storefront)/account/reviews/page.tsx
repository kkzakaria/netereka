import { requireAuth } from "@/lib/auth/guards";
import { getUserReviews, getReviewableProducts } from "@/lib/db/reviews";
import { StarRating } from "@/components/storefront/star-rating";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { ReviewableProducts } from "./reviewable-products";

export default async function ReviewsPage() {
  const session = await requireAuth();
  const [reviews, reviewable] = await Promise.all([
    getUserReviews(session.user.id),
    getReviewableProducts(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Mes avis</h2>

      {/* Reviewable products */}
      {reviewable.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Produits en attente d&apos;avis</h3>
          <ReviewableProducts products={reviewable} />
        </section>
      )}

      {/* Existing reviews */}
      {reviews.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Vous n&apos;avez pas encore laissé d&apos;avis
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/p/${review.product_slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {review.product_name}
                  </Link>
                  <div className="mt-1">
                    <StarRating value={review.rating} readonly />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
