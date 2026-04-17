"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getImageUrl } from "@/lib/utils/images";
import { uploadStoryImage } from "@/actions/admin/story";
import type { ProductFeatureBlock } from "@/lib/db/types";

interface StoryFeatureBlockEditorProps {
  productId: string;
  block: ProductFeatureBlock;
  index: number;
  onChange: (next: ProductFeatureBlock) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function StoryFeatureBlockEditor({
  productId,
  block,
  index,
  onChange,
  onRemove,
  canRemove,
}: StoryFeatureBlockEditorProps) {
  const [isUploading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const result = await uploadStoryImage(productId, fd);
        if (result.success && result.url) {
          onChange({ ...block, image_url: result.url });
          toast.success("Image téléchargée");
        } else {
          setError(result.error || "Erreur lors de l'upload");
          toast.error(result.error || "Erreur lors de l'upload");
        }
      } catch (err) {
        console.error("[StoryFeatureBlockEditor] upload failed", err);
        toast.error("Erreur inattendue");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Bloc {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Supprimer le bloc"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`block-${index}-title`}>Titre</Label>
        <Input
          id={`block-${index}-title`}
          value={block.title}
          maxLength={120}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Un argument, une phrase"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`block-${index}-body`}>Texte</Label>
          <span className="text-xs text-muted-foreground">
            {block.body.length}/600
          </span>
        </div>
        <Textarea
          id={`block-${index}-body`}
          value={block.body}
          maxLength={600}
          rows={4}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
          placeholder="Décris l'argument en 2-4 phrases"
        />
      </div>

      <div className="space-y-2">
        <Label>Image (optionnelle)</Label>
        {block.image_url ? (
          <div className="relative h-40 w-full overflow-hidden rounded-md border">
            <Image
              src={getImageUrl(block.image_url)}
              alt={block.image_alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => onChange({ ...block, image_url: undefined, image_alt: undefined })}
            >
              Retirer
            </Button>
          </div>
        ) : (
          <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent/50">
            <HugeiconsIcon icon={Upload04Icon} size={18} />
            {isUploading ? "Téléchargement..." : "Télécharger une image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = ""; // allow re-selecting same file
              }}
            />
          </label>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {block.image_url && (
        <div className="space-y-2">
          <Label htmlFor={`block-${index}-alt`}>Texte alternatif</Label>
          <Input
            id={`block-${index}-alt`}
            value={block.image_alt ?? ""}
            maxLength={200}
            onChange={(e) => onChange({ ...block, image_alt: e.target.value })}
            placeholder="Description de l'image pour l'accessibilité"
          />
        </div>
      )}
    </div>
  );
}
