"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductDetail } from "@/lib/db/types";
import { updateProduct } from "@/actions/admin/products";
import { CategoryCascadingSelect, type CategoryOption } from "./category-cascading-select";
import { SectionNav, type SectionDef } from "./section-nav";
import { AiGenerateButton } from "./ai-generate-button";
import { generateProductText, suggestCategory } from "@/actions/admin/ai";
import type { ProductTextResult, CategorySuggestionResult } from "@/lib/ai/schemas";

const ImageManager = dynamic(() => import("./image-manager").then((m) => m.ImageManager));
const VariantList = dynamic(() => import("./variant-list").then((m) => m.VariantList));

const SECTIONS: SectionDef[] = [
  { id: "section-general", label: "Informations" },
  { id: "section-category", label: "Catégorie" },
  { id: "section-pricing", label: "Tarification" },
  { id: "section-specs", label: "Caractéristiques" },
  { id: "section-images", label: "Images" },
  { id: "section-variants", label: "Variantes" },
  { id: "section-seo", label: "SEO" },
  { id: "section-visibility", label: "Visibilité" },
];

interface ProductFormSectionsProps {
  product: ProductDetail;
  categories: CategoryOption[];
}

export function ProductFormSections({
  product,
  categories,
}: ProductFormSectionsProps) {
  const isNew = product.is_draft === 1;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isActiveRef = useRef<HTMLInputElement>(null);
  const isFeaturedRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement>(null);
  const metaTitleRef = useRef<HTMLInputElement>(null);
  const metaDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [categorySuggestions, setCategorySuggestions] = useState<
    CategorySuggestionResult["suggestions"]
  >([]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await updateProduct(product.id, formData);
        if (result.success) {
          toast.success(isNew ? "Produit créé" : "Produit mis à jour");
          if (isNew) {
            router.replace(`/products/${product.id}/edit`);
          }
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main content — sections */}
        <div className="space-y-6 lg:col-span-3">
          {/* Section: Informations générales */}
          <Card id="section-general">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Informations générales</CardTitle>
              <AiGenerateButton<ProductTextResult>
                label="Générer les textes"
                onGenerate={() => {
                  const name = (document.getElementById("name") as HTMLInputElement)?.value;
                  if (!name) return Promise.resolve({ success: false as const, error: "Entrez d'abord le nom du produit" });
                  const brand = (document.getElementById("brand") as HTMLInputElement)?.value;
                  return generateProductText({ name, brand });
                }}
                onResult={(data) => {
                  if (descriptionRef.current) descriptionRef.current.value = data.description;
                  if (shortDescriptionRef.current) shortDescriptionRef.current.value = data.shortDescription;
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={product.name}
                  placeholder="Ex: iPhone 15 Pro Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={isNew ? "" : product.slug}
                  placeholder="Auto-généré si vide"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque</Label>
                  <Input
                    id="brand"
                    name="brand"
                    defaultValue={product.brand ?? ""}
                    placeholder="Ex: Apple"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={product.sku ?? ""}
                    placeholder="Ex: IP15PM-256"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_description">Description courte</Label>
                <Input
                  id="short_description"
                  name="short_description"
                  ref={shortDescriptionRef}
                  defaultValue={product.short_description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  ref={descriptionRef}
                  rows={5}
                  defaultValue={product.description ?? ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Catégorie */}
          <Card id="section-category">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Catégorie</CardTitle>
              <AiGenerateButton<CategorySuggestionResult>
                label="Suggérer"
                onGenerate={() => {
                  const name = (document.getElementById("name") as HTMLInputElement)?.value;
                  if (!name) return Promise.resolve({ success: false as const, error: "Entrez d'abord le nom du produit" });
                  const desc = descriptionRef.current?.value;
                  return suggestCategory({ productName: name, description: desc });
                }}
                onResult={(data) => {
                  setCategorySuggestions(data.suggestions);
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <CategoryCascadingSelect
                categories={categories}
                defaultCategoryId={product.category_id || undefined}
              />
              {categorySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categorySuggestions.map((s) => (
                    <button
                      key={s.categoryId}
                      type="button"
                      className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("ai-category-select", { detail: { categoryId: s.categoryId } })
                        );
                        setCategorySuggestions([]);
                      }}
                    >
                      {s.categoryName} ({Math.round(s.confidence * 100)}%)
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section: Tarification & Stock */}
          <Card id="section-pricing">
            <CardHeader>
              <CardTitle>Tarification &amp; Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Prix (FCFA)</Label>
                  <Input
                    id="base_price"
                    name="base_price"
                    type="number"
                    min={0}
                    required
                    defaultValue={isNew ? "" : product.base_price}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compare_price">Ancien prix (FCFA)</Label>
                  <Input
                    id="compare_price"
                    name="compare_price"
                    type="number"
                    min={0}
                    defaultValue={product.compare_price ?? ""}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Quantité en stock</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    min={0}
                    defaultValue={product.stock_quantity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Seuil d&apos;alerte stock</Label>
                  <Input
                    id="low_stock_threshold"
                    name="low_stock_threshold"
                    type="number"
                    min={0}
                    defaultValue={product.low_stock_threshold}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Caractéristiques */}
          <Card id="section-specs">
            <CardHeader>
              <CardTitle>Caractéristiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="weight_grams">Poids (grammes)</Label>
                <Input
                  id="weight_grams"
                  name="weight_grams"
                  type="number"
                  min={0}
                  defaultValue={product.weight_grams ?? ""}
                  placeholder="Optionnel"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Images */}
          <Card id="section-images">
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageManager productId={product.id} images={product.images} />
            </CardContent>
          </Card>

          {/* Section: Variantes */}
          <Card id="section-variants">
            <CardHeader>
              <CardTitle>Variantes</CardTitle>
            </CardHeader>
            <CardContent>
              <VariantList productId={product.id} variants={product.variants} />
            </CardContent>
          </Card>

          {/* Section: SEO */}
          <Card id="section-seo">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>SEO</CardTitle>
              <AiGenerateButton<ProductTextResult>
                label="Générer SEO"
                onGenerate={() => {
                  const name = (document.getElementById("name") as HTMLInputElement)?.value;
                  if (!name) return Promise.resolve({ success: false as const, error: "Entrez d'abord le nom du produit" });
                  const brand = (document.getElementById("brand") as HTMLInputElement)?.value;
                  return generateProductText({ name, brand });
                }}
                onResult={(data) => {
                  if (metaTitleRef.current) metaTitleRef.current.value = data.metaTitle;
                  if (metaDescriptionRef.current) metaDescriptionRef.current.value = data.metaDescription;
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta_title">Meta title</Label>
                  <span className="text-xs text-muted-foreground">max 60 caractères</span>
                </div>
                <Input
                  id="meta_title"
                  name="meta_title"
                  ref={metaTitleRef}
                  defaultValue={product.meta_title ?? ""}
                  maxLength={60}
                  placeholder="Titre pour les moteurs de recherche"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta_description">Meta description</Label>
                  <span className="text-xs text-muted-foreground">max 160 caractères</span>
                </div>
                <Textarea
                  id="meta_description"
                  name="meta_description"
                  ref={metaDescriptionRef}
                  rows={3}
                  defaultValue={product.meta_description ?? ""}
                  maxLength={160}
                  placeholder="Description pour les moteurs de recherche"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Visibilité */}
          <Card id="section-visibility">
            <CardHeader>
              <CardTitle>Visibilité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Produit actif</Label>
                  <p className="text-sm text-muted-foreground">Visible sur la boutique</p>
                </div>
                <input
                  type="hidden"
                  name="is_active"
                  ref={isActiveRef}
                  defaultValue={product.is_active}
                />
                <Switch
                  defaultChecked={product.is_active === 1}
                  onCheckedChange={(checked) => {
                    if (isActiveRef.current) isActiveRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Produit vedette</Label>
                  <p className="text-sm text-muted-foreground">Affiché dans la section vedette</p>
                </div>
                <input
                  type="hidden"
                  name="is_featured"
                  ref={isFeaturedRef}
                  defaultValue={product.is_featured}
                />
                <Switch
                  defaultChecked={product.is_featured === 1}
                  onCheckedChange={(checked) => {
                    if (isFeaturedRef.current) isFeaturedRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile submit button (hidden on desktop where SectionNav has it) */}
          <div className="lg:hidden">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? "Enregistrement…"
                : isNew
                  ? "Créer le produit"
                  : "Mettre à jour"}
            </Button>
          </div>
        </div>

        {/* Side navigation — desktop only */}
        <div className="hidden lg:block">
          <SectionNav
            sections={SECTIONS}
            submitLabel={isNew ? "Créer le produit" : "Mettre à jour"}
            isPending={isPending}
          />
        </div>
      </div>
    </form>
  );
}
