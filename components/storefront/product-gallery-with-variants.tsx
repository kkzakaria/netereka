"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type { ProductImage, ProductVariant } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import { ImageGallery } from "./image-gallery";
import { VariantSelector } from "./variant-selector";

interface Props {
  images: ProductImage[];
  variants: ProductVariant[];
  basePrice: number;
  product: { id: string; name: string; slug: string; imageUrl: string | null };
  children: React.ReactNode;
}

export function ProductGalleryWithVariants({
  images,
  variants,
  basePrice,
  product,
  children,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);

  const handleVariantChange = useCallback(
    (variantId: string) => {
      const idx = images.findIndex((img) => img.variant_id === variantId);
      if (idx !== -1) {
        setSelectedImage(idx);
      }
    },
    [images],
  );

  const primaryImage = images[0];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ImageGallery
        images={images}
        selectedIndex={selectedImage}
        onSelectedChange={setSelectedImage}
      >
        {primaryImage && (
          <Image
            src={getImageUrl(primaryImage.url)}
            alt={primaryImage.alt || product.name}
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-6"
          />
        )}
      </ImageGallery>

      <div className="space-y-4">
        {children}
        <VariantSelector
          variants={variants}
          basePrice={basePrice}
          product={product}
          onVariantChange={handleVariantChange}
        />
      </div>
    </div>
  );
}
