// components/admin/product-wizard/step-pricing.tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ProductDetail } from "@/lib/db/types";

interface StepPricingProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

type ColorInfo = { name: string; hex: string };

/** Parse "Nom|#hex" format from product attributes */
function parseColorValue(raw: string): ColorInfo {
  const idx = raw.lastIndexOf("|");
  if (idx !== -1 && raw[idx + 1] === "#") {
    return { name: raw.slice(0, idx), hex: raw.slice(idx + 1) };
  }
  return { name: raw, hex: "#000000" };
}

/** Convert attribute color format "Nom|#hex" to variant format "Nom:#hex" */
function toVariantColorValue(raw: string): string {
  const { name, hex } = parseColorValue(raw);
  return `${name}:${hex}`;
}

export function StepPricing({ product, formRef, isPending }: StepPricingProps) {
  const colors = product.attributes
    .filter((a) => a.name === "Couleur")
    .map((a) => ({
      raw: a.value,
      ...parseColorValue(a.value),
      variantColor: toVariantColorValue(a.value),
    }));

  const hasColors = colors.length > 0;

  // Find existing variant for each color (match by color attribute)
  function findVariantForColor(variantColor: string) {
    return product.variants.find((v) => {
      try {
        const attrs = JSON.parse(v.attributes);
        return attrs.color === variantColor;
      } catch {
        return false;
      }
    });
  }

  const [uniformPrice, setUniformPrice] = useState(() => {
    if (!hasColors) return true;
    // If all color variants have the same price, default to uniform
    const prices = colors
      .map((c) => findVariantForColor(c.variantColor)?.price)
      .filter((p) => p != null);
    if (prices.length <= 1) return true;
    return prices.every((p) => p === prices[0]);
  });

  const [stocksRaw, setStocks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of colors) {
      const variant = findVariantForColor(c.variantColor);
      map[c.variantColor] = String(variant?.stock_quantity ?? 0);
    }
    return map;
  });

  const [pricesRaw, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of colors) {
      const variant = findVariantForColor(c.variantColor);
      map[c.variantColor] = variant?.price ? String(variant.price) : "";
    }
    return map;
  });

  // Merge raw state with defaults for any new colors — synchronous, no flicker
  const stocks = useMemo(() => {
    const merged: Record<string, string> = { ...stocksRaw };
    for (const c of colors) {
      if (!(c.variantColor in merged)) {
        const variant = findVariantForColor(c.variantColor);
        merged[c.variantColor] = String(variant?.stock_quantity ?? 0);
      }
    }
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocksRaw, product.attributes, product.variants]);

  const prices = useMemo(() => {
    const merged: Record<string, string> = { ...pricesRaw };
    for (const c of colors) {
      if (!(c.variantColor in merged)) {
        const variant = findVariantForColor(c.variantColor);
        merged[c.variantColor] = variant?.price ? String(variant.price) : "";
      }
    }
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesRaw, product.attributes, product.variants]);

  // Serialize variant data for the server action
  const variantData = hasColors
    ? JSON.stringify(
        colors.map((c) => ({
          color: c.variantColor,
          colorName: c.name,
          stock: parseInt(stocks[c.variantColor]) || 0,
          // When uniform price, server will use base_price
          price: uniformPrice ? null : (parseInt(prices[c.variantColor]) || null),
        })),
      )
    : "";

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="3" />
      <input type="hidden" name="uniform_price" value={uniformPrice ? "1" : "0"} />
      {hasColors && <input type="hidden" name="variants" value={variantData} />}

      {/* Prix */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-base-price">
            Prix de vente <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupInput
              id="wiz-base-price"
              name="base_price"
              type="number"
              min={0}
              step={1}
              required
              disabled={isPending}
              defaultValue={product.base_price > 0 ? product.base_price : ""}
              placeholder="ex: 125000"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-compare-price">Prix barré</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Ancien prix avant promotion. Affiché barré sur la fiche produit."
            >
              ?
            </span>
          </div>
          <InputGroup>
            <InputGroupInput
              id="wiz-compare-price"
              name="compare_price"
              type="number"
              min={0}
              step={1}
              disabled={isPending}
              defaultValue={product.compare_price ?? ""}
              placeholder="Optionnel"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Per-color stock & pricing */}
      {hasColors && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Stock par couleur</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="wiz-uniform-price" className="text-xs text-muted-foreground">
                Prix unique
              </Label>
              <Switch
                id="wiz-uniform-price"
                checked={uniformPrice}
                onCheckedChange={setUniformPrice}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Couleur</th>
                  {!uniformPrice && (
                    <th className="px-3 py-2 text-left font-medium">Prix (FCFA)</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((c, i) => (
                  <tr
                    key={c.variantColor}
                    className={i < colors.length - 1 ? "border-b" : ""}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </div>
                    </td>
                    {!uniformPrice && (
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          disabled={isPending}
                          value={prices[c.variantColor] ?? ""}
                          onChange={(e) =>
                            setPrices((prev) => ({
                              ...prev,
                              [c.variantColor]: e.target.value,
                            }))
                          }
                          placeholder="Prix de vente"
                          className="h-8 w-28"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={isPending}
                        value={stocks[c.variantColor] ?? "0"}
                        onChange={(e) =>
                          setStocks((prev) => ({
                            ...prev,
                            [c.variantColor]: e.target.value,
                          }))
                        }
                        className="h-8 w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock global (sans couleurs) */}
      {!hasColors && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wiz-stock">Quantité en stock</Label>
            <Input
              id="wiz-stock"
              name="stock_quantity"
              type="number"
              min={0}
              step={1}
              disabled={isPending}
              defaultValue={product.stock_quantity}
            />
          </div>
        </div>
      )}

      {/* Seuil d'alerte */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-threshold">Seuil d&apos;alerte stock</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Vous serez alerté lorsque le stock passe sous ce seuil."
            >
              ?
            </span>
          </div>
          <Input
            id="wiz-threshold"
            name="low_stock_threshold"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.low_stock_threshold}
          />
        </div>
      </div>
    </form>
  );
}
