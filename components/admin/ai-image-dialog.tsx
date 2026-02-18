"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateBannerImage } from "@/actions/admin/ai";
import { getImageUrl } from "@/lib/utils/images";

interface AiImageDialogProps {
  onImageGenerated: (imageUrl: string) => void;
}

export function AiImageDialog({ onImageGenerated }: AiImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"product" | "abstract" | "lifestyle">("abstract");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Décrivez l'image souhaitée");
      return;
    }
    setIsLoading(true);
    setPreviewUrl(null);
    try {
      const result = await generateBannerImage({ prompt, style });
      if (result.success && result.data) {
        setPreviewUrl(result.data.imageUrl);
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur de connexion. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseImage() {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      setOpen(false);
      setPreviewUrl(null);
      setPrompt("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <span className="text-sm">✨</span>
          <span>Générer une image</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer une image de bannière</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-image-prompt">Description de l&apos;image</Label>
            <Input
              id="ai-image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Smartphones modernes sur fond technologique"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-image-style">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
              <SelectTrigger id="ai-image-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produit</SelectItem>
                <SelectItem value="abstract">Abstrait</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {previewUrl && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border">
              <Image
                src={getImageUrl(previewUrl)}
                alt="Image générée par IA"
                fill
                className="object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Génération...
                </>
              ) : previewUrl ? (
                "Régénérer"
              ) : (
                "Générer"
              )}
            </Button>
            {previewUrl && (
              <Button type="button" variant="outline" onClick={handleUseImage} className="flex-1">
                Utiliser cette image
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
