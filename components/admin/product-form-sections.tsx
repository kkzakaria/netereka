"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductDetail } from "@/lib/db/types";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import { updateProduct } from "@/actions/admin/products";
import { CategoryCascadingSelect } from "./category-cascading-select";
import { SectionNav, type SectionDef } from "./section-nav";
import { ImageManager } from "./image-manager";
import { VariantList } from "./variant-list";

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
  categories: CategoryWithCount[];
  isNew?: boolean;
}

export function ProductFormSections({
  product,
  categories,
  isNew = false,
}: ProductFormSectionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isActiveRef = useRef<HTMLInputElement>(null);
  const isFeaturedRef = useRef<HTMLInputElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProduct(product.id, formData);
      if (result.success) {
        toast.success(isNew ? "Produit créé" : "Produit mis à jour");
        if (isNew) {
          router.replace(`/products/${product.id}/edit`);
        }
      } else {
        toast.error(result.error);
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
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
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
                  defaultValue={product.short_description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={product.description ?? ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Catégorie */}
          <Card id="section-category">
            <CardHeader>
              <CardTitle>Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryCascadingSelect
                categories={categories}
                defaultCategoryId={product.category_id || undefined}
              />
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
            <CardHeader>
              <CardTitle>SEO</CardTitle>
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
