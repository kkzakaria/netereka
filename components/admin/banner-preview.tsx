import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import type { BadgeColor } from "@/lib/db/types";

interface BannerPreviewProps {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: BadgeColor;
  price: number | null;
  imageUrl: string | null;
  bgFrom: string;
  bgTo: string;
  ctaText: string;
}

const decorativeOrbs = (
  <>
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#00FF9C]/10 blur-2xl" />
    <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />
  </>
);

const badgeColorMap: Record<BadgeColor, string> = {
  mint: "bg-emerald-500/20 text-emerald-300",
  red: "bg-red-500/20 text-red-300",
  orange: "bg-orange-500/20 text-orange-300",
  blue: "bg-blue-500/20 text-blue-300",
};

export function BannerPreview({
  title,
  subtitle,
  badgeText,
  badgeColor,
  price,
  imageUrl,
  bgFrom,
  bgTo,
  ctaText,
}: BannerPreviewProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Prévisualisation
      </p>
      <div
        className="relative mx-auto h-[240px] w-[624px] max-w-full overflow-hidden rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }}
      >
        {/* Decorative orbs */}
        {decorativeOrbs}

        <div className="grid h-full grid-cols-2 items-center gap-3 px-4 py-4">
          {/* Text glass card */}
          <div className="rounded-lg border border-white/20 bg-white/10 p-3 shadow-xl backdrop-blur-xl">
            {badgeText && (
              <span
                className={cn(
                  "mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                  badgeColorMap[badgeColor]
                )}
              >
                {badgeText}
              </span>
            )}
            <p className="text-sm font-bold leading-tight text-white line-clamp-2">
              {title || "Titre de la bannière"}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-white/70 line-clamp-2">
                {subtitle}
              </p>
            )}
            {price != null && (
              <p className="mt-1 text-xs font-semibold text-emerald-300">
                {formatPrice(price)}
              </p>
            )}
            <span
              className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold"
              style={{ color: bgFrom }}
            >
              {ctaText || "Découvrir"}
            </span>
          </div>

          {/* Product image */}
          {imageUrl ? (
            <div className="relative mx-auto h-[168px] w-full">
              <Image
                src={imageUrl}
                alt={title || "Bannière"}
                fill
                className="object-contain"
                sizes="300px"
              />
            </div>
          ) : (
            <div className="mx-auto flex h-[168px] w-full items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <span className="text-xs text-white/40">Image produit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
