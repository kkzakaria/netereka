"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product, Category } from "@/lib/db/types";
import { createProduct, updateProduct } from "@/actions/admin/products";

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!product;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(product!.id, formData)
        : await createProduct(formData);

      if (result.success) {
        toast.success(isEdit ? "Produit mis à jour" : "Produit créé");
        if (!isEdit && result.id) {
          router.push(`/products/${result.id}/edit`);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
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
                  defaultValue={product?.name ?? ""}
                  placeholder="Ex: iPhone 15 Pro Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={product?.slug ?? ""}
                  placeholder="Auto-généré si vide"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque</Label>
                  <Input
                    id="brand"
                    name="brand"
                    defaultValue={product?.brand ?? ""}
                    placeholder="Ex: Apple"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={product?.sku ?? ""}
                    placeholder="Ex: IP15PM-256"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_description">Description courte</Label>
                <Input
                  id="short_description"
                  name="short_description"
                  defaultValue={product?.short_description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={product?.description ?? ""}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">Catégorie</Label>
                <Select name="category_id" defaultValue={product?.category_id ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Actif</Label>
                <input
                  type="hidden"
                  name="is_active"
                  id="is_active_hidden"
                  defaultValue={product?.is_active ?? 1}
                />
                <Switch
                  id="is_active"
                  defaultChecked={product ? product.is_active === 1 : true}
                  onCheckedChange={(checked) => {
                    const el = document.getElementById("is_active_hidden") as HTMLInputElement;
                    el.value = checked ? "1" : "0";
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_featured">Vedette</Label>
                <input
                  type="hidden"
                  name="is_featured"
                  id="is_featured_hidden"
                  defaultValue={product?.is_featured ?? 0}
                />
                <Switch
                  id="is_featured"
                  defaultChecked={product?.is_featured === 1}
                  onCheckedChange={(checked) => {
                    const el = document.getElementById("is_featured_hidden") as HTMLInputElement;
                    el.value = checked ? "1" : "0";
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Prix (FCFA)</Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  min={0}
                  required
                  defaultValue={product?.base_price ?? ""}
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
                  defaultValue={product?.compare_price ?? ""}
                  placeholder="Optionnel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_quantity ?? 0}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer le produit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
