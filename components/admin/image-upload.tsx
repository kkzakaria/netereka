"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/actions/admin/images";

export function ImageUpload({ productId }: { productId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (result.success) {
        toast.success("Image ajoutée");
      } else {
        toast.error(result.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        id="image-upload"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? "Upload..." : "Ajouter une image"}
      </Button>
    </div>
  );
}
