"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { Banner, Product } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { cn } from "@/lib/utils";

interface Slide {
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  badge_color: string;
  image_url: string | null;
  link_url: string;
  cta_text: string;
  price: number | null;
  bg_from: string;
  bg_to: string;
}

const badgeColorMap: Record<string, string> = {
  mint: "bg-emerald-500/20 text-emerald-300",
  red: "bg-red-500/20 text-red-300",
  orange: "bg-orange-500/20 text-orange-300",
  blue: "bg-blue-500/20 text-blue-300",
};

function buildSlides(banners: Banner[], fallbackProducts: Product[]): Slide[] {
  if (banners.length > 0) {
    return banners.map((b) => ({
      title: b.title,
      subtitle: b.subtitle,
      badge_text: b.badge_text,
      badge_color: b.badge_color || "mint",
      image_url: b.image_url,
      link_url: b.link_url,
      cta_text: b.cta_text || "Découvrir",
      price: b.price,
      bg_from: b.bg_gradient_from || "#183C78",
      bg_to: b.bg_gradient_to || "#1E4A8F",
    }));
  }

  return fallbackProducts.slice(0, 3).map((p) => ({
    title: p.name,
    subtitle: p.brand || null,
    badge_text: p.is_featured ? "En vedette" : null,
    badge_color: "mint",
    image_url: p.image_url || null,
    link_url: `/p/${p.slug}`,
    cta_text: "Découvrir",
    price: p.base_price,
    bg_from: "#183C78",
    bg_to: "#1E4A8F",
  }));
}

export function HeroBanner({
  banners,
  fallbackProducts,
}: {
  banners: Banner[];
  fallbackProducts: Product[];
}) {
  const slides = buildSlides(banners, fallbackProducts);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 }, [
    Autoplay({
      delay: 5000,
      stopOnInteraction: true,
      active: !prefersReducedMotion,
    }),
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (slides.length === 0) return null;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Bannières promotionnelles"
      className="relative overflow-hidden rounded-2xl"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={i}
              role="tabpanel"
              aria-roledescription="slide"
              aria-label={slide.title}
              className="relative h-[280px] min-w-0 flex-[0_0_100%] overflow-hidden sm:h-[400px] lg:h-[480px]"
              style={{
                background: `linear-gradient(135deg, ${slide.bg_from}, ${slide.bg_to})`,
              }}
            >
              {/* Decorative orbs */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00FF9C]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

              <div className="grid h-full items-center gap-6 px-6 py-8 sm:grid-cols-2 sm:py-12">
                {/* Text content with glass card */}
                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                  {slide.badge_text && (
                    <span
                      className={cn(
                        "mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                        badgeColorMap[slide.badge_color] ||
                          badgeColorMap.mint
                      )}
                    >
                      {slide.badge_text}
                    </span>
                  )}

                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {slide.title}
                  </h2>

                  {slide.subtitle && (
                    <p className="mt-2 text-sm text-white/70 sm:text-base">
                      {slide.subtitle}
                    </p>
                  )}

                  {slide.price != null && (
                    <p className="mt-3 text-lg font-semibold text-emerald-300">
                      {formatPrice(slide.price)}
                    </p>
                  )}

                  <Link
                    href={slide.link_url}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ color: slide.bg_from }}
                  >
                    {slide.cta_text}
                  </Link>
                </div>

                {/* Image */}
                {slide.image_url && (
                  <div className="relative mx-auto aspect-square w-full max-w-xs">
                    <Image
                      src={getImageUrl(slide.image_url)}
                      alt={slide.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 80vw, 320px"
                      {...(i === 0
                        ? { priority: true, fetchPriority: "high" as const }
                        : { loading: "lazy" as const })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div
          role="tablist"
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === selectedIndex}
              aria-label={`Slide ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === selectedIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
