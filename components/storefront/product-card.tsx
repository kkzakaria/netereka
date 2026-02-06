import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  isWishlisted?: boolean;
  showWishlist?: boolean;
}

export function ProductCard({ product, isWishlisted = false, showWishlist = false }: Props) {
  const hasVariants = (product.variant_count ?? 0) > 1;
  const isOutOfStock = product.stock_quantity <= 0;
  const hasDiscount = product.compare_price != null && product.compare_price > product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.base_price) / product.compare_price!) * 100)
    : 0;

  return (
    <Link
      href={`/p/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card touch-manipulation",
        "transition-[box-shadow,border-color] duration-300 ease-out",
        "hover:shadow-lg hover:border-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isOutOfStock && "opacity-70"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Image
          src={getImageUrl(product.image_url)}
          alt={product.name}
          fill
          className={cn(
            "object-contain p-4",
            "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out",
            !isOutOfStock && "group-hover:scale-105"
          )}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Top row: category + wishlist */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {product.category_name ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {product.category_name}
            </span>
          ) : <span />}
          {showWishlist && (
            <WishlistButton
              productId={product.id}
              isWishlisted={isWishlisted}
              className="size-11"
            />
          )}
        </div>

        {/* Discount badge — top right */}
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white">
            -{discountPercent}%
          </span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-semibold text-background">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {/* Brand — always reserve one line */}
        <span className={cn("truncate text-[11px] font-medium uppercase tracking-wider", product.brand ? "text-muted-foreground" : "invisible")}>
          {product.brand || "\u00A0"}
        </span>
        <h3 className="line-clamp-2 min-h-[2lh] text-sm font-medium leading-snug text-pretty">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          {/* Variant hint — always reserve one line */}
          <span className={cn("text-[11px]", hasVariants ? "text-muted-foreground" : "invisible")}>
            {hasVariants ? "À partir de" : "\u00A0"}
          </span>
          <p className="text-sm font-bold tabular-nums text-foreground">
            {formatPrice(product.base_price)}
          </p>
          {/* Compare price — always reserve one line */}
          <p className={cn("text-[10px] tabular-nums line-through", hasDiscount ? "text-muted-foreground" : "invisible")}>
            {hasDiscount ? formatPrice(product.compare_price!) : "\u00A0"}
          </p>
        </div>
      </div>
    </Link>
  );
}
