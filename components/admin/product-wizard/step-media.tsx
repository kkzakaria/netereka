// components/admin/product-wizard/step-media.tsx
"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils/images";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
} from "@/actions/admin/images";
import { ImageUpload } from "@/components/admin/image-upload";
import type { ProductDetail } from "@/lib/db/types";

interface StepMediaProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
}

type ColorInfo = { variantId: string | null; name: string; hex: string };

/** Parse "Nom|#hex" format from product attributes */
function parseColorValue(raw: string): { name: string; hex: string } {
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

/** Parse variant color format "Nom:#hex" or "Nom" */
function parseVariantColor(stored: string): { name: string; hex: string } {
  const idx = stored.lastIndexOf(":#");
  if (idx > 0 && stored.length - idx <= 8) {
    return { name: stored.slice(0, idx), hex: stored.slice(idx + 1) };
  }
  const pipeIdx = stored.lastIndexOf("|");
  if (pipeIdx !== -1 && stored[pipeIdx + 1] === "#") {
    return { name: stored.slice(0, pipeIdx), hex: stored.slice(pipeIdx + 1) };
  }
  return { name: stored, hex: "#000000" };
}

export function StepMedia({ product, formRef }: StepMediaProps) {
  const [isPending, startTransition] = useTransition();

  // Build color→variant mapping from product variants
  const colorVariants = product.variants
    .map((v): ColorInfo | null => {
      try {
        const attrs = JSON.parse(v.attributes);
        if (!attrs.color) return null;
        const parsed = parseVariantColor(attrs.color);
        return { variantId: v.id, name: parsed.name, hex: parsed.hex };
      } catch {
        return null;
      }
    })
    .filter((c): c is ColorInfo => c !== null);

  // Build colors from attributes — always shown, even without variants
  const attrColors: ColorInfo[] = product.attributes
    .filter((a) => a.name === "Couleur")
    .map((a) => {
      const parsed = parseColorValue(a.value);
      const variantColor = toVariantColorValue(a.value);
      const variant = product.variants.find((v) => {
        try {
          return JSON.parse(v.attributes).color === variantColor;
        } catch {
          return false;
        }
      });
      return { variantId: variant?.id ?? null, name: parsed.name, hex: parsed.hex };
    });

  const colors = attrColors.length > 0 ? attrColors : colorVariants;
  const hasColors = colors.length > 0;

  // Images not assigned to any color variant
  const generalImages = hasColors
    ? product.images.filter(
        (img) => !img.variant_id || !colors.some((c) => c.variantId === img.variant_id),
      )
    : product.images;

  function handleUpload(file: File, variantId?: string) {
    const formData = new FormData();
    formData.set("file", file);
    if (variantId) formData.set("variant_id", variantId);
    startTransition(async () => {
      const result = await uploadProductImage(product.id, formData);
      if (result.success) {
        toast.success("Image ajoutée");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId, product.id);
      if (result.success) {
        toast.success("Image supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    startTransition(async () => {
      const result = await setPrimaryImage(imageId, product.id);
      if (result.success) {
        toast.success("Image principale définie");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="4" />

      <div>
        <h3 className="text-sm font-semibold">Images</h3>
        <p className="text-xs text-muted-foreground">
          Ajoutez au moins une photo avant de publier.
          {hasColors && " Téléchargez une image pour chaque couleur du produit."}
        </p>
      </div>

      {product.images.length === 0 && !hasColors && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Aucune image pour l&apos;instant. Au moins une image est recommandée avant la
          publication.
        </div>
      )}

      {/* Per-color image table */}
      {hasColors && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Image par couleur</h3>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Couleur</th>
                  <th className="px-3 py-2 text-left font-medium">Image</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((color, i) => {
                  const img = color.variantId
                    ? product.images.find((im) => im.variant_id === color.variantId)
                    : undefined;
                  return (
                    <tr
                      key={color.variantId ?? `color-${color.name}`}
                      className={i < colors.length - 1 ? "border-b" : ""}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-4 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {img ? (
                          <div className="flex items-center gap-2">
                            <Image
                              src={getImageUrl(img.url)}
                              alt={img.alt || color.name}
                              width={40}
                              height={40}
                              className="size-10 shrink-0 rounded-md border object-cover"
                            />
                            {img.is_primary === 1 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                Principale
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {img ? (
                            <>
                              {img.is_primary !== 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  disabled={isPending}
                                  onClick={() => handleSetPrimary(img.id)}
                                >
                                  Principale
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                disabled={isPending}
                                onClick={() => handleDelete(img.id)}
                              >
                                Supprimer
                              </Button>
                            </>
                          ) : color.variantId ? (
                            <ColorUploadButton
                              variantId={color.variantId}
                              disabled={isPending}
                              onUpload={handleUpload}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Définissez le prix d&apos;abord
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General images */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {hasColors ? "Images générales" : "Images"}{" "}
            ({generalImages.length})
          </h3>
          <ImageUpload productId={product.id} />
        </div>

        {generalImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {generalImages.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-lg border"
                data-pending={isPending || undefined}
              >
                <Image
                  src={getImageUrl(img.url)}
                  alt={img.alt || ""}
                  width={200}
                  height={200}
                  className="aspect-square w-full object-cover"
                />
                {img.is_primary === 1 && (
                  <Badge className="absolute top-2 left-2">Principale</Badge>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 touch-manipulation">
                  <div className="flex w-full gap-1.5 p-2">
                    {img.is_primary !== 1 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 text-xs"
                        disabled={isPending}
                        onClick={() => handleSetPrimary(img.id)}
                      >
                        Principale
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 text-xs"
                      disabled={isPending}
                      onClick={() => handleDelete(img.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {hasColors
              ? "Ajoutez des photos du packaging, accessoires, etc."
              : "Aucune image. Cliquez sur « Ajouter une image » pour commencer."}
          </div>
        )}
      </div>
    </form>
  );
}

/* ── Upload button per color ───────────────────────────────────── */

function ColorUploadButton({
  variantId,
  disabled,
  onUpload,
}: {
  variantId: string;
  disabled: boolean;
  onUpload: (file: File, variantId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file, variantId);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {disabled ? "Upload..." : "Télécharger"}
      </Button>
    </>
  );
}
