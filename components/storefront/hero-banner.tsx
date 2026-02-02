import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";

export function HeroBanner({ product }: { product: Product }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hero-bg to-hero-bg-dark text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-6 py-10 sm:grid-cols-2 sm:py-16">
        <div className="space-y-4">
          {product.brand && (
            <span className="text-sm font-medium uppercase tracking-widest text-emerald-300">
              {product.brand}
            </span>
          )}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h2>
          <p className="text-lg font-semibold text-emerald-300">
            {formatPrice(product.base_price)}
          </p>
          <Link
            href={`/p/${product.slug}`}
            className="inline-flex items-center rounded-full bg-hero-accent px-6 py-3 text-sm font-semibold text-hero-bg transition-opacity hover:opacity-90"
          >
            Découvrir
          </Link>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-xs">
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.name}
            fill
            className="object-contain drop-shadow-2xl"
            sizes="(max-width: 640px) 80vw, 320px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
