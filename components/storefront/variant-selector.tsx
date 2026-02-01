"use client";

import { useState, useMemo } from "react";
import type { ProductVariant, ParsedVariantAttributes } from "@/lib/db/types";
import { formatPrice } from "@/lib/utils/format";

function parseAttributes(variant: ProductVariant): ParsedVariantAttributes {
  try {
    return JSON.parse(variant.attributes);
  } catch {
    return {};
  }
}

export function VariantSelector({
  variants,
  basePrice,
}: {
  variants: ProductVariant[];
  basePrice: number;
}) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");

  const { colors, storages, selectedVariant } = useMemo(() => {
    const colorSet = new Set<string>();
    const storageSet = new Set<string>();
    let selected: ProductVariant | undefined;

    for (const v of variants) {
      const attrs = parseAttributes(v);
      if (attrs.color) colorSet.add(attrs.color);
      if (attrs.storage) storageSet.add(attrs.storage);
      if (v.id === selectedId) selected = v;
    }

    return {
      colors: [...colorSet],
      storages: [...storageSet],
      selectedVariant: selected ?? variants[0],
    };
  }, [variants, selectedId]);

  const selectedAttrs = selectedVariant ? parseAttributes(selectedVariant) : {};

  function selectByAttrs(color?: string, storage?: string) {
    const target = variants.find((v) => {
      const a = parseAttributes(v);
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

      {colors.length > 1 && (
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
      )}

      {storages.length > 1 && (
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
      )}

      <button
        disabled
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-50"
      >
        Ajouter au panier
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Bientôt disponible
      </p>
    </div>
  );
}
