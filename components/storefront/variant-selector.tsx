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

const COLOR_HEX_MAP: Record<string, string> = {
  Noir: "#000000",
  Blanc: "#FFFFFF",
  Bleu: "#2563EB",
  Rouge: "#DC2626",
  Vert: "#16A34A",
  Rose: "#EC4899",
  Violet: "#7C3AED",
  Gris: "#6B7280",
  Or: "#D97706",
  Argent: "#9CA3AF",
};

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{3,8}$/;

/** Parse "Bleu", "Corail:#FF5733", or "#968b7b" into { name, hex } */
function parseColorValue(raw: string): { name: string; hex: string | null } {
  // Pure hex value like "#968b7b"
  if (HEX_COLOR_REGEX.test(raw)) {
    return { name: raw, hex: raw };
  }
  // "Name:#hex" format like "Corail:#FF5733"
  const idx = raw.lastIndexOf(":#");
  if (idx > 0 && raw.length - idx <= 8) {
    return { name: raw.slice(0, idx), hex: raw.slice(idx + 1) };
  }
  // Named color lookup
  return { name: raw, hex: COLOR_HEX_MAP[raw] ?? null };
}

/** Display labels for known attribute keys */
const ATTR_LABELS: Record<string, string> = {
  color: "Couleur",
  storage: "Stockage",
  ram: "RAM",
  edition: "Édition",
  size: "Taille",
  connectivity: "Connectivité",
};

function getAttrLabel(key: string): string {
  return ATTR_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
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

  // Dynamically detect all attribute keys and their unique values
  const { attrKeys, attrValues, selectedVariant } = useMemo(() => {
    const valuesByKey = new Map<string, Set<string>>();
    let selected: ProductVariant | undefined;

    for (const v of variants) {
      const attrs = parsedMap.get(v.id)!;
      for (const [key, val] of Object.entries(attrs)) {
        if (val == null) continue;
        if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
        valuesByKey.get(key)!.add(val);
      }
      if (v.id === selectedId) selected = v;
    }

    // Only keep keys with more than 1 unique value (otherwise nothing to choose)
    const keys = [...valuesByKey.keys()].filter(
      (k) => valuesByKey.get(k)!.size > 1
    );

    const values = new Map<string, string[]>();
    for (const k of keys) {
      values.set(k, [...valuesByKey.get(k)!]);
    }

    return {
      attrKeys: keys,
      attrValues: values,
      selectedVariant: selected ?? variants[0],
    };
  }, [variants, selectedId, parsedMap]);

  const selectedAttrs = parsedMap.get(selectedVariant?.id ?? "") ?? {};

  function selectByAttrs(updatedKey: string, updatedValue: string) {
    // Build desired attrs: current selection + the changed key
    const desired: Record<string, string> = {};
    for (const key of attrKeys) {
      desired[key] =
        key === updatedKey ? updatedValue : (selectedAttrs[key] ?? "");
    }

    // Find best matching variant (most attribute matches wins)
    let bestMatch: ProductVariant | undefined;
    let bestScore = -1;
    for (const v of variants) {
      const a = parsedMap.get(v.id)!;
      let score = 0;
      let mismatchOnUpdated = false;
      for (const key of attrKeys) {
        if (desired[key] && a[key] === desired[key]) {
          score++;
        } else if (key === updatedKey) {
          mismatchOnUpdated = true;
        }
      }
      // The updated key must match
      if (mismatchOnUpdated) continue;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = v;
      }
    }
    if (bestMatch) setSelectedId(bestMatch.id);
  }

  const price = selectedVariant?.price ?? basePrice;
  const comparePrice = selectedVariant?.compare_price ?? null;
  const hasDiscount = comparePrice != null && comparePrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;
  const isOutOfStock = (selectedVariant?.stock_quantity ?? 0) <= 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold">{formatPrice(price)}</p>
          {hasDiscount && (
            <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-white">
              -{discountPercent}%
            </span>
          )}
        </div>
        {hasDiscount && (
          <p className="text-sm text-muted-foreground line-through">
            {formatPrice(comparePrice)}
          </p>
        )}
      </div>

      {attrKeys.map((key) => {
        const values = attrValues.get(key)!;
        const isColor = key === "color";

        return (
          <div key={key}>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {getAttrLabel(key)} :{" "}
              <span className="text-foreground">
                {isColor
                  ? parseColorValue(selectedAttrs[key] ?? "").name
                  : (selectedAttrs[key] ?? "")}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const isSelected = selectedAttrs[key] === val;

                if (isColor) {
                  const { name, hex } = parseColorValue(val);
                  return (
                    <button
                      key={val}
                      onClick={() => selectByAttrs(key, val)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "hover:border-foreground/30"
                      }`}
                    >
                      {hex && (
                        <span
                          className="inline-block size-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: hex }}
                        />
                      )}
                      {name}
                    </button>
                  );
                }

                return (
                  <button
                    key={val}
                    onClick={() => selectByAttrs(key, val)}
                    className={`rounded-lg border px-4 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "hover:border-foreground/30"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {isOutOfStock && (
        <p className="text-sm font-medium text-destructive">Rupture de stock</p>
      )}

      <AddToCartButton
        disabled={isOutOfStock}
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
