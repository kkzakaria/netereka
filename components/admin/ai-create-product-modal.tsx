"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateProductBlueprint, createProductFromBlueprint } from "@/actions/admin/ai";
import type { ProductBlueprint } from "@/lib/ai/schemas";

interface AiCreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "preview";

interface GeneratedData {
  blueprint: ProductBlueprint;
  categoryName: string;
  imageUrls: string[];
}

export function AiCreateProductModal({
  open,
  onOpenChange,
}: AiCreateProductModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isCreating, startCreating] = useTransition();

  function handleClose(open: boolean) {
    if (!open) {
      setStep("form");
      setName("");
      setBrand("");
      setGenerated(null);
    }
    onOpenChange(open);
  }

  function handleGenerate() {
    if (!name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }
    startGenerating(async () => {
      const result = await generateProductBlueprint({
        name: name.trim(),
        brand: brand.trim() || undefined,
      });
      if (result.success && result.data) {
        setGenerated(result.data);
        setStep("preview");
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    });
  }

  function handleConfirm() {
    if (!generated) return;
    startCreating(async () => {
      const result = await createProductFromBlueprint({
        blueprint: generated.blueprint,
        imageUrls: generated.imageUrls,
      });
      if (result.success && result.id) {
        toast.success("Produit créé avec succès");
        handleClose(false);
        router.push(`/products/${result.id}/edit`);
      } else {
        toast.error(result.error || "Erreur lors de la création");
      }
    });
  }

  const bp = generated?.blueprint;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✨</span>
            <span>Créer un produit avec l&apos;IA</span>
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "L'IA va rechercher les informations du produit et générer son contenu, ses variantes et ses images."
              : "Vérifiez les informations générées avant de créer le produit."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-product-name">Nom du produit *</Label>
              <Input
                id="ai-product-name"
                placeholder="ex: iPhone 16 Pro, Samsung Galaxy S25..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isGenerating}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-brand">Marque (optionnel)</Label>
              <Input
                id="ai-brand"
                placeholder="ex: Apple, Samsung, Sony..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isGenerating}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isGenerating}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !name.trim()}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Génération...
                  </>
                ) : (
                  <>✨ Générer</>
                )}
              </Button>
            </div>
            {isGenerating && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                Recherche des informations et génération en cours...
              </p>
            )}
          </div>
        )}

        {step === "preview" && bp && (
          <div className="space-y-4 pt-2">
            {/* Product info */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-base">{bp.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {bp.base_price.toLocaleString("fr-FR")} XOF
                </span>
              </div>
              {bp.brand && (
                <p className="text-muted-foreground">Marque : {bp.brand}</p>
              )}
              <p className="text-muted-foreground">
                Catégorie : {generated?.categoryName}
              </p>
              <p className="mt-2">{bp.short_description}</p>
            </div>

            {/* Images preview */}
            {generated && generated.imageUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Images ({generated.imageUrls.length})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {generated.imageUrls.slice(0, 3).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Image ${i + 1}`}
                      className="h-20 w-20 shrink-0 rounded-md object-cover border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Variants */}
            {bp.variants.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">
                  Variantes ({bp.variants.length})
                </p>
                <div className="rounded-md border text-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium">Nom</th>
                        <th className="text-right px-3 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bp.variants.map((v, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">{v.name}</td>
                          <td className="px-3 py-2 text-right">{v.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune variante générée. Vous pourrez en ajouter dans l&apos;éditeur.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isCreating}
                className="flex-1"
              >
                ← Modifier
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isCreating}
                className="flex-1 gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Création...
                  </>
                ) : (
                  "Confirmer et créer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
