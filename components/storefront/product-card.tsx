import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { WishlistButton } from "@/components/storefront/wishlist-button";

interface Props {
  product: Product;
  isWishlisted?: boolean;
  showWishlist?: boolean;
}

export function ProductCard({ product, isWishlisted = false, showWishlist = false }: Props) {
  const hasVariants = (product.variant_count ?? 0) > 1;

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={getImageUrl(product.image_url)}
          alt={product.name}
          fill
          className="object-contain p-4 transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {showWishlist && (
          <WishlistButton
            productId={product.id}
            isWishlisted={isWishlisted}
            className="absolute right-2 top-2 z-10"
          />
        )}
        {product.category_name ? (
          <span className="absolute left-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {product.category_name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {product.brand}
          </span>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          {hasVariants ? (
            <span className="text-[10px] text-muted-foreground">À partir de</span>
          ) : null}
          <p className="text-sm font-bold text-foreground">
            {formatPrice(product.base_price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
