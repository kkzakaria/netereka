"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductImage } from "@/lib/db/types";
import { deleteProductImage, setPrimaryImage } from "@/actions/admin/images";
import { ImageUpload } from "./image-upload";

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId, productId);
      if (result.success) {
        toast.success("Image supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    startTransition(async () => {
      const result = await setPrimaryImage(imageId, productId);
      if (result.success) {
        toast.success("Image principale définie");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Images ({images.length})</h3>
        <ImageUpload productId={productId} />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border"
              data-pending={isPending || undefined}
            >
              <Image
                src={img.url}
                alt={img.alt || ""}
                width={200}
                height={200}
                className="aspect-square w-full object-cover"
              />
              {img.is_primary === 1 && (
                <Badge className="absolute top-2 left-2">Principale</Badge>
              )}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full gap-1 p-2">
                  {img.is_primary !== 1 && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleSetPrimary(img.id)}
                    >
                      Principale
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="destructive"
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
          Aucune image. Cliquez sur &quot;Ajouter une image&quot; pour commencer.
        </div>
      )}
    </div>
  );
}
