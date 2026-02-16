"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";

interface ImageGalleryProps {
  images: ProductImage[];
  children?: ReactNode;
}

export function ImageGallery({ images, children }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground">
        Aucune image
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {selected === 0 && children ? (
          children
        ) : (
          <Image
            src={getImageUrl(current.url)}
            alt={current.alt || "Produit"}
            fill
            className="object-contain p-6"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === selected ? "border-primary" : "border-transparent"
              }`}
            >
              <Image
                src={getImageUrl(img.url)}
                alt={img.alt || "Image du produit"}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
