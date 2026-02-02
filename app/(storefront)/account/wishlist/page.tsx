import { requireAuth } from "@/lib/auth/guards";
import { getUserWishlist } from "@/lib/db/wishlist";
import { WishlistGrid } from "./wishlist-grid";
import Link from "next/link";

export default async function WishlistPage() {
  const session = await requireAuth();
  const items = await getUserWishlist(session.user.id);

  // Only pass fields needed by the client component (server-serialization)
  const clientItems = items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    name: item.name,
    slug: item.slug,
    base_price: item.base_price,
    brand: item.brand,
    image_url: item.image_url,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Mes favoris</h2>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Votre liste de favoris est vide</p>
          <Link href="/" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <WishlistGrid items={clientItems} />
      )}
    </div>
  );
}
