"use client";

import { useState, useMemo } from "react";
import type { ProductVariant, ParsedVariantAttributes } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";

function parseAttributes(variant: ProductVariant): ParsedVariantAttributes {
  try {
    return JSON.parse(variant.attributes);
  } catch {
    return {};
  }
}

interface ProductInfo {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export function VariantSelector({
  variants,
  basePrice,
  product,
}: {
  variants: ProductVariant[];
  basePrice: number;
  product: ProductInfo;
}) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");

  // Parse all attributes once and memoize
  const parsedMap = useMemo(
    () => new Map(variants.map((v) => [v.id, parseAttributes(v)])),
    [variants]
  );

  const { colors, storages, selectedVariant } = useMemo(() => {
    const colorSet = new Set<string>();
    const storageSet = new Set<string>();
    let selected: ProductVariant | undefined;

    for (const v of variants) {
      const attrs = parsedMap.get(v.id)!;
      if (attrs.color) colorSet.add(attrs.color);
      if (attrs.storage) storageSet.add(attrs.storage);
      if (v.id === selectedId) selected = v;
    }

    return {
      colors: [...colorSet],
      storages: [...storageSet],
      selectedVariant: selected ?? variants[0],
    };
  }, [variants, selectedId, parsedMap]);

  const selectedAttrs = parsedMap.get(selectedVariant?.id ?? "") ?? {};

  function selectByAttrs(color?: string, storage?: string) {
    const target = variants.find((v) => {
      const a = parsedMap.get(v.id)!;
      const colorMatch = !color || a.color === color;
      const storageMatch = !storage || a.storage === storage;
      return colorMatch && storageMatch;
    });
    if (target) setSelectedId(target.id);
  }

  const price = selectedVariant?.price ?? basePrice;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-bold">{formatPrice(price)}</p>
      </div>

      {colors.length > 1 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Couleur : <span className="text-foreground">{selectedAttrs.color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => selectByAttrs(color, selectedAttrs.storage)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  selectedAttrs.color === color
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-foreground/30"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {storages.length > 1 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Stockage : <span className="text-foreground">{selectedAttrs.storage}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {storages.map((storage) => (
              <button
                key={storage}
                onClick={() => selectByAttrs(selectedAttrs.color, storage)}
                className={`rounded-lg border px-4 py-1.5 text-sm transition-colors ${
                  selectedAttrs.storage === storage
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-foreground/30"
                }`}
              >
                {storage}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AddToCartButton
        item={{
          productId: product.id,
          variantId: selectedVariant?.id ?? null,
          name: product.name,
          variantName: selectedVariant?.name ?? null,
          price,
          imageUrl: product.imageUrl,
          slug: product.slug,
        }}
      />
    </div>
  );
}
