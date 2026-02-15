import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  isWishlisted?: boolean;
  showWishlist?: boolean;
}

export function ProductCard({ product, isWishlisted = false, showWishlist = false }: Props) {
  const hasVariants = (product.variant_count ?? 0) > 1;
  const isOutOfStock = product.stock_quantity <= 0;
  const comparePrice = product.compare_price;
  const hasDiscount = comparePrice != null && comparePrice > product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - product.base_price) / comparePrice) * 100)
    : 0;

  return (
    <Link
      href={`/p/${product.slug}`}
      aria-label={isOutOfStock ? `${product.name} — Rupture de stock` : undefined}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card touch-manipulation",
        "transition-[box-shadow,border-color] duration-300 ease-out",
        "hover:shadow-lg hover:border-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

        {/* Category badge */}
        {product.category_name && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {product.category_name}
          </span>
        )}

        {/* Quick action buttons */}
        <ProductCardActions
          product={product}
          isWishlisted={isWishlisted}
          showWishlist={showWishlist}
        />

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
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
        <h3 className="line-clamp-2 min-h-[2.625rem] text-sm font-medium leading-snug text-pretty">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          {/* Variant hint — always reserve one line */}
          <span className={cn("text-[11px]", hasVariants ? "text-muted-foreground" : "invisible")}>
            {hasVariants ? "À partir de" : "\u00A0"}
          </span>
          <p className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-foreground">
            {formatPrice(product.base_price)}
            {hasDiscount && (
              <span className="rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white">
                -{discountPercent}%
              </span>
            )}
          </p>
          {/* Compare price — always reserve one line */}
          <p className={cn("text-[10px] tabular-nums line-through", hasDiscount ? "text-muted-foreground" : "invisible")}>
            {hasDiscount ? formatPrice(comparePrice) : "\u00A0"}
          </p>
        </div>
      </div>
    </Link>
  );
}
