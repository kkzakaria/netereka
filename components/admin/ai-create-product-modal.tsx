"use client";

import { useState, useRef, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createProductFromBlueprint } from "@/actions/admin/ai";
import { productBlueprintSchema } from "@/lib/ai/schemas";
import type { ProductBlueprint } from "@/lib/ai/schemas";
import type { SSEEvent } from "@/lib/ai/stream";
import type { CategoryOption } from "@/lib/db/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface AiCreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
}

type Step = "form" | "preview";

interface GeneratedData {
  blueprint: ProductBlueprint;
  categoryName: string;
  imageUrls: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function* readSSEStream(
  response: Response
): AsyncGenerator<SSEEvent, void, unknown> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (part.startsWith("data: ")) {
        try {
          yield JSON.parse(part.slice(6)) as SSEEvent;
        } catch (err) {
          console.warn("[ai-modal] Malformed SSE event:", part, err);
        }
      }
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AiCreateProductModal({
  open,
  onOpenChange,
  categories,
}: AiCreateProductModalProps) {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");

  // Generation state
  const [step, setStep] = useState<Step>("form");
  const [statusMsg, setStatusMsg] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview/edit state
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [editedBlueprint, setEditedBlueprint] = useState<ProductBlueprint | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function handleClose(open: boolean) {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStep("form");
      setName("");
      setBrand("");
      setGenerated(null);
      setEditedBlueprint(null);
      setSelectedCategoryId("");
      setSelectedImages(new Set());
      setStatusMsg("");
      setIsGenerating(false);
    }
    onOpenChange(open);
  }

  async function handleGenerate() {
    if (!name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setIsGenerating(true);
    setStatusMsg("Démarrage...");

    try {
      const response = await fetch("/api/admin/ai/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || undefined,
        }),
        signal: ac.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Erreur d'authentification. Reconnectez-vous.");
        } else {
          toast.error("Erreur du serveur. Réessayez.");
        }
        return;
      }

      if (!response.body) {
        toast.error("Réponse du serveur invalide. Réessayez.");
        return;
      }

      for await (const event of readSSEStream(response)) {
        if (event.type === "status") {
          setStatusMsg(event.message);
        } else if (event.type === "done") {
          const blueprintResult = productBlueprintSchema.safeParse(event.blueprint);
          if (!blueprintResult.success) {
            toast.error("Données générées invalides. Réessayez.");
            break;
          }
          const data: GeneratedData = {
            blueprint: blueprintResult.data,
            categoryName: event.categoryName,
            imageUrls: event.imageUrls,
          };
          setGenerated(data);
          setEditedBlueprint({ ...blueprintResult.data });
          setSelectedCategoryId(blueprintResult.data.categoryId);
          setSelectedImages(new Set(event.imageUrls));
          setStep("preview");
        } else if (event.type === "error") {
          toast.error(event.message || "Erreur lors de la génération");
          break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User closed modal — no toast needed
      } else {
        console.error("[ai-modal] handleGenerate error:", err);
        toast.error("Erreur de connexion. Réessayez.");
      }
    } finally {
      setIsGenerating(false);
      setStatusMsg("");
    }
  }

  function handleConfirm() {
    if (!editedBlueprint) return;
    startTransition(async () => {
      const result = await createProductFromBlueprint({
        blueprint: { ...editedBlueprint, categoryId: selectedCategoryId },
        imageUrls: Array.from(selectedImages),
      });
      if (result.success && result.id) {
        toast.success("Produit créé. Ajoutez les prix dans l'éditeur.");
        handleClose(false);
        router.push(`/products/${result.id}/edit`);
      } else {
        toast.error(result.error || "Erreur lors de la création");
      }
    });
  }

  function updateVariant(
    idx: number,
    field: "name" | "stock_quantity",
    value: string | number
  ) {
    if (!editedBlueprint) return;
    const variants = [...editedBlueprint.variants];
    variants[idx] = { ...variants[idx], [field]: value };
    setEditedBlueprint({ ...editedBlueprint, variants });
  }

  function toggleImage(url: string) {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  const bp = editedBlueprint;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un produit avec l&apos;IA</DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "L'IA recherche et génère le contenu. Les prix seront à saisir ensuite."
              : "Vérifiez et ajustez les informations générées."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Étape 1 : Formulaire ─────────────────────────────────────────── */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-name">Nom du produit *</Label>
              <Input
                id="ai-name"
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
                placeholder="ex: Apple, Samsung..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isGenerating}
              />
            </div>
            {isGenerating && (
              <p className="animate-pulse text-center text-sm text-muted-foreground">
                {statusMsg}
              </p>
            )}
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
                  "✨ Générer"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Preview éditable ───────────────────────────────────── */}
        {step === "preview" && bp && (
          <div className="space-y-5 pt-2">
            {/* Nom + Marque */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={bp.name}
                  onChange={(e) =>
                    setEditedBlueprint({ ...bp, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Marque</Label>
                <Input
                  value={bp.brand ?? ""}
                  onChange={(e) =>
                    setEditedBlueprint({ ...bp, brand: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Catégorie */}
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descriptions */}
            <div className="space-y-1.5">
              <Label>Description courte</Label>
              <Textarea
                rows={2}
                value={bp.short_description}
                onChange={(e) =>
                  setEditedBlueprint({
                    ...bp,
                    short_description: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={bp.description}
                onChange={(e) =>
                  setEditedBlueprint({ ...bp, description: e.target.value })
                }
              />
            </div>

            {/* SEO */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Meta title</Label>
                <Input
                  value={bp.meta_title}
                  onChange={(e) =>
                    setEditedBlueprint({ ...bp, meta_title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Meta description</Label>
                <Input
                  value={bp.meta_description}
                  onChange={(e) =>
                    setEditedBlueprint({
                      ...bp,
                      meta_description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Variantes */}
            {bp.variants.length > 0 && (
              <div>
                <Label className="mb-2 block">
                  Variantes ({bp.variants.length}) — Prix à saisir dans
                  l&apos;éditeur
                </Label>
                <div className="overflow-hidden rounded-md border text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">
                          Nom
                        </th>
                        <th className="w-24 px-3 py-2 text-right font-medium">
                          Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bp.variants.map((v, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5">
                            <Input
                              className="h-7 text-sm"
                              value={v.name}
                              onChange={(e) =>
                                updateVariant(i, "name", e.target.value)
                              }
                            />
                          </td>
                          <td className="w-24 px-3 py-1.5">
                            <Input
                              className="h-7 text-right text-sm"
                              type="number"
                              min={0}
                              value={v.stock_quantity}
                              onChange={(e) =>
                                updateVariant(
                                  i,
                                  "stock_quantity",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Images */}
            {generated && generated.imageUrls.length > 0 && (
              <div>
                <Label className="mb-2 block">
                  Images ({selectedImages.size}/{generated.imageUrls.length}{" "}
                  sélectionnées)
                </Label>
                <div className="flex flex-wrap gap-3">
                  {generated.imageUrls.map((url, i) => (
                    <label key={i} className="group relative cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Image ${i + 1}`}
                        className={`h-20 w-20 rounded-md border-2 object-cover transition-all ${
                          selectedImages.has(url)
                            ? "border-primary"
                            : "border-transparent opacity-50"
                        }`}
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).parentElement!.style.display = "none";
                        }}
                      />
                      <Checkbox
                        className="absolute right-1 top-1"
                        checked={selectedImages.has(url)}
                        onCheckedChange={() => toggleImage(url)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isPending}
                className="flex-1"
              >
                ← Regénérer
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || !selectedCategoryId}
                className="flex-1 gap-2"
              >
                {isPending ? (
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
