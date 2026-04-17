"use client";

import { useRef, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ColorPicker } from "@/components/admin/color-picker";
import { ImageUpload } from "@/components/admin/image-upload";
import dynamic from "next/dynamic";
const DescriptionEditor = dynamic(
  () => import("./description-editor").then((m) => m.DescriptionEditor),
  { ssr: false },
);
import { getImageUrl } from "@/lib/utils/images";
import type { ProductDetail } from "@/lib/db/types";
import {
  updateProduct,
  saveProductAttributes,
  saveColorVariants,
} from "@/actions/admin/products";
import {
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
} from "@/actions/admin/images";
import {
  CategoryCascadingSelect,
  type CategoryOption,
} from "./category-cascading-select";
import { SectionNav, type SectionDef } from "./section-nav";
import { ProductStorySection } from "./product-story-section";


const SECTIONS: SectionDef[] = [
  { id: "section-general", label: "Informations" },
  { id: "section-category", label: "Catégorie" },
  { id: "section-specs", label: "Caractéristiques" },
  { id: "section-story", label: "Story" },
  { id: "section-pricing", label: "Tarification" },
  { id: "section-images", label: "Images" },
  { id: "section-seo", label: "SEO" },
  { id: "section-visibility", label: "Visibilité" },
];

// ── Color parsing helpers ────────────────────────────────────────

const PRESET_COLORS = [
  { name: "Noir", hex: "#1a1a1a" },
  { name: "Blanc", hex: "#f5f5f5" },
  { name: "Gris", hex: "#9e9e9e" },
  { name: "Argent", hex: "#c0c0c0" },
  { name: "Or", hex: "#d4a847" },
  { name: "Or rose", hex: "#e8b4b8" },
  { name: "Titane", hex: "#878781" },
  { name: "Bleu", hex: "#1565c0" },
  { name: "Bleu nuit", hex: "#1a237e" },
  { name: "Rouge", hex: "#c62828" },
  { name: "Vert", hex: "#2e7d32" },
  { name: "Violet", hex: "#6a1b9a" },
  { name: "Orange", hex: "#e65100" },
  { name: "Jaune", hex: "#f9a825" },
];

const FIXED_KEYS = new Set([
  "Longueur",
  "Hauteur",
  "Largeur",
  "Poids",
  "Couleur",
]);
const FIXED_DIMS = [
  { key: "Longueur", unit: "mm" },
  { key: "Hauteur", unit: "mm" },
  { key: "Largeur", unit: "mm" },
  { key: "Poids", unit: "g" },
];

type ColorEntry = { uid: string; name: string; hex: string };
type AttrRow = { uid: string; name: string; value: string };

function parseColorValue(raw: string): { name: string; hex: string } {
  const idx = raw.lastIndexOf("|");
  if (idx !== -1 && raw[idx + 1] === "#") {
    return { name: raw.slice(0, idx), hex: raw.slice(idx + 1) };
  }
  return { name: raw, hex: "#000000" };
}

function toVariantColorValue(raw: string): string {
  const { name, hex } = parseColorValue(raw);
  return `${name}:${hex}`;
}

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

// ── Main component ───────────────────────────────────────────────

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
      } catch (err) {
        console.error(
          "[ProductFormSections] handleSubmit unexpected error:",
          err,
        );
        toast.error(
          "Une erreur inattendue est survenue. Veuillez réessayer.",
        );
      }
    });
  }

  return (
    <form action={handleSubmit}>
      {/* Carry weight_grams from attributes for updateProduct */}
      <input type="hidden" name="weight_grams" value={
        product.attributes.find((a) => a.name === "Poids")?.value ?? ""
      } />
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
                {!isNew && product.sku && (
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <p className="font-mono text-sm text-muted-foreground">
                      {product.sku}
                    </p>
                  </div>
                )}
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
                <Label>Contenu complémentaire</Label>
                <p className="text-xs text-muted-foreground">
                  S&apos;affiche dans le bloc « zone libre » de la Story, sous les blocs structurés.
                </p>
                <DescriptionEditor
                  name="description"
                  descriptionType={product.description_type}
                  defaultValue={product.description}
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

          {/* Section: Caractéristiques */}
          <Card id="section-specs">
            <CardHeader>
              <CardTitle>Caractéristiques</CardTitle>
            </CardHeader>
            <CardContent>
              <AttributesSection product={product} />
            </CardContent>
          </Card>

          {/* Section: Story */}
          <Card id="section-story">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Story produit</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Blocs éditoriaux rendus en pleine largeur sur la fiche produit.
                    Tous les blocs sont optionnels.
                  </p>
                </div>
                {!isNew && product.slug && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <a href={`/p/${product.slug}`} target="_blank" rel="noopener noreferrer">
                      Aperçu
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProductStorySection
                productId={product.id}
                tagline={product.tagline}
                highlights={product.highlights}
                featureBlocks={product.feature_blocks}
                faq={product.faq}
              />
            </CardContent>
          </Card>

          {/* Section: Tarification & Stock */}
          <Card id="section-pricing">
            <CardHeader>
              <CardTitle>Tarification &amp; Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <PricingSection product={product} />
            </CardContent>
          </Card>

          {/* Section: Images */}
          <Card id="section-images">
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaSection product={product} />
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
                  <span className="text-xs text-muted-foreground">
                    max 60 caractères
                  </span>
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
                  <span className="text-xs text-muted-foreground">
                    max 160 caractères
                  </span>
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
                  <p className="text-sm text-muted-foreground">
                    Visible sur la boutique
                  </p>
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
                    if (isActiveRef.current)
                      isActiveRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Produit vedette</Label>
                  <p className="text-sm text-muted-foreground">
                    Affiché dans la section vedette
                  </p>
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
                    if (isFeaturedRef.current)
                      isFeaturedRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile submit button (hidden on desktop where SectionNav has it) */}
          <div className="lg:hidden">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? "Enregistrement..."
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

// ── Attributes Section ───────────────────────────────────────────

function AttributesSection({ product }: { product: ProductDetail }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [colors, setColors] = useState<ColorEntry[]>(() =>
    product.attributes
      .filter((a) => a.name === "Couleur")
      .map((a) => ({ uid: a.id, ...parseColorValue(a.value) })),
  );
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#000000");
  const [fixed, setFixed] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const d of FIXED_DIMS) {
      const existing = product.attributes.find((a) => a.name === d.key);
      map[d.key] = existing?.value ?? "";
    }
    return map;
  });
  const [extras, setExtras] = useState<AttrRow[]>(() =>
    product.attributes
      .filter((a) => !FIXED_KEYS.has(a.name))
      .map((a) => ({ uid: a.id, name: a.name, value: a.value })),
  );

  function addColor(name?: string, hex?: string) {
    const n = (name ?? newName).trim();
    const h = hex ?? newHex;
    if (!n) return;
    if (!colors.some((c) => c.name === n)) {
      setColors((prev) => [
        ...prev,
        { uid: crypto.randomUUID(), name: n, hex: h },
      ]);
    }
    if (!name) {
      setNewName("");
      setNewHex("#000000");
    }
  }

  function handleSave() {
    const serialized = JSON.stringify([
      ...colors.map((c) => ({
        name: "Couleur",
        value: `${c.name}|${c.hex}`,
      })),
      ...FIXED_DIMS.filter((d) => fixed[d.key]?.trim()).map((d) => ({
        name: d.key,
        value: fixed[d.key].trim(),
      })),
      ...extras
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), value: a.value.trim() })),
    ]);
    const fd = new FormData();
    fd.set("attributes", serialized);
    startTransition(async () => {
      try {
        const result = await saveProductAttributes(product.id, fd);
        if (result.success) {
          toast.success("Caractéristiques enregistrées");
          router.refresh();
        } else {
          toast.error(result.error || "Erreur lors de la sauvegarde");
        }
      } catch (err) {
        console.error("[AttributesSection] handleSave failed:", err);
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Couleurs disponibles</h3>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => {
            const active = colors.some((c) => c.name === p.name);
            return (
              <button
                key={p.name}
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (active)
                    setColors((prev) =>
                      prev.filter((c) => c.name !== p.name),
                    );
                  else addColor(p.name, p.hex);
                }}
                title={p.name}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="size-3 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: p.hex }}
                />
                {p.name}
              </button>
            );
          })}
        </div>
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <span
                key={c.uid}
                className="flex items-center gap-2 rounded-full border bg-muted py-1 pl-1.5 pr-3 text-sm"
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setColors((prev) =>
                      prev.filter((x) => x.uid !== c.uid),
                    )
                  }
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                  aria-label={`Retirer ${c.name}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <ColorPicker
            value={newHex}
            onChange={setNewHex}
            className="w-36 shrink-0"
          />
          <Input
            value={newName}
            disabled={isPending}
            placeholder="Nom (ex: Noir, Bleu nuit...)"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => addColor()}
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Dimensions &amp; Poids</h3>
        <div className="grid grid-cols-2 gap-3">
          {FIXED_DIMS.map((d) => (
            <div key={d.key} className="space-y-1.5">
              <Label htmlFor={`edit-fixed-${d.key}`} className="text-xs">
                {d.key}{" "}
                <span className="text-muted-foreground">({d.unit})</span>
              </Label>
              <Input
                id={`edit-fixed-${d.key}`}
                type="number"
                min={0}
                step="any"
                value={fixed[d.key]}
                onChange={(e) =>
                  setFixed((prev) => ({ ...prev, [d.key]: e.target.value }))
                }
                disabled={isPending}
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Extras */}
      {extras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Autres caractéristiques
          </h3>
          {extras.map((attr) => (
            <div
              key={attr.uid}
              className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2"
            >
              <Input
                value={attr.name}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((a) =>
                      a.uid === attr.uid
                        ? { ...a, name: e.target.value }
                        : a,
                    ),
                  )
                }
                disabled={isPending}
                placeholder="ex: Écran"
              />
              <Input
                value={attr.value}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((a) =>
                      a.uid === attr.uid
                        ? { ...a, value: e.target.value }
                        : a,
                    ),
                  )
                }
                disabled={isPending}
                placeholder='ex: 6.7" AMOLED'
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() =>
                  setExtras((prev) =>
                    prev.filter((a) => a.uid !== attr.uid),
                  )
                }
                className="text-muted-foreground hover:text-destructive"
                aria-label="Supprimer"
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            setExtras((prev) => [
              ...prev,
              { uid: crypto.randomUUID(), name: "", value: "" },
            ])
          }
        >
          + Ajouter une caractéristique
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Enregistrement..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
}

// ── Pricing Section ──────────────────────────────────────────────

function PricingSection({ product }: { product: ProductDetail }) {
  const [isPending, startTransition] = useTransition();

  const colors = product.attributes
    .filter((a) => a.name === "Couleur")
    .map((a) => ({
      raw: a.value,
      ...parseColorValue(a.value),
      variantColor: toVariantColorValue(a.value),
    }));
  const hasColors = colors.length > 0;

  function findVariantForColor(variantColor: string) {
    const target = variantColor.toLowerCase();
    return product.variants.find((v) => {
      try {
        const color = JSON.parse(v.attributes).color;
        return color?.toLowerCase() === target;
      } catch (err) {
        console.warn(`[PricingSection] Failed to parse variant attributes for id="${v.id}":`, err);
        return false;
      }
    });
  }

  const [uniformPrice, setUniformPrice] = useState(() => {
    if (!hasColors) return true;
    const ps = colors
      .map((c) => findVariantForColor(c.variantColor)?.price)
      .filter((p) => p != null);
    if (ps.length <= 1) return true;
    return ps.every((p) => p === ps[0]);
  });

  const [stocksRaw, setStocks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of colors) {
      map[c.variantColor] = String(
        findVariantForColor(c.variantColor)?.stock_quantity ?? 0,
      );
    }
    return map;
  });
  const [pricesRaw, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of colors) {
      const v = findVariantForColor(c.variantColor);
      map[c.variantColor] = v?.price ? String(v.price) : "";
    }
    return map;
  });

  const stocks = useMemo(() => {
    const merged: Record<string, string> = { ...stocksRaw };
    for (const c of colors) {
      if (!(c.variantColor in merged))
        merged[c.variantColor] = String(
          findVariantForColor(c.variantColor)?.stock_quantity ?? 0,
        );
    }
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocksRaw, product.attributes, product.variants]);

  const prices = useMemo(() => {
    const merged: Record<string, string> = { ...pricesRaw };
    for (const c of colors) {
      if (!(c.variantColor in merged)) {
        const v = findVariantForColor(c.variantColor);
        merged[c.variantColor] = v?.price ? String(v.price) : "";
      }
    }
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesRaw, product.attributes, product.variants]);

  function handleSaveVariants() {
    const basePriceEl = document.querySelector<HTMLInputElement>(
      'input[name="base_price"]',
    );
    if (!basePriceEl || !basePriceEl.value || parseInt(basePriceEl.value) <= 0) {
      toast.error("Veuillez définir un prix de base avant de sauvegarder les variantes.");
      return;
    }
    const comparePriceEl = document.querySelector<HTMLInputElement>(
      'input[name="compare_price"]',
    );
    const basePrice = basePriceEl.value;
    const comparePrice = comparePriceEl?.value ?? "";

    const variantData = JSON.stringify(
      colors.map((c) => ({
        color: c.variantColor,
        colorName: c.name,
        stock: parseInt(stocks[c.variantColor]) || 0,
        price: uniformPrice
          ? null
          : parseInt(prices[c.variantColor]) || null,
      })),
    );

    const fd = new FormData();
    fd.set("variants", variantData);
    fd.set("uniform_price", uniformPrice ? "1" : "0");
    fd.set("base_price", basePrice);
    fd.set("compare_price", comparePrice);

    startTransition(async () => {
      try {
        const result = await saveColorVariants(product.id, fd);
        if (result.success) toast.success("Stock par couleur enregistré");
        else toast.error(result.error || "Erreur lors de la sauvegarde");
      } catch (err) {
        console.error("[PricingSection] handleSaveVariants failed:", err);
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Base prices — these are regular form inputs for updateProduct */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base_price">Prix (FCFA)</Label>
          <InputGroup>
            <InputGroupInput
              id="base_price"
              name="base_price"
              type="number"
              min={0}
              required
              defaultValue={
                product.base_price > 0 ? product.base_price : ""
              }
              placeholder="0"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="compare_price">Ancien prix (FCFA)</Label>
          <InputGroup>
            <InputGroupInput
              id="compare_price"
              name="compare_price"
              type="number"
              min={0}
              defaultValue={product.compare_price ?? ""}
              placeholder="Optionnel"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Per-color stock & pricing */}
      {hasColors && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Stock par couleur</h3>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="edit-uniform-price"
                className="text-xs text-muted-foreground"
              >
                Prix unique
              </Label>
              <Switch
                id="edit-uniform-price"
                checked={uniformPrice}
                onCheckedChange={setUniformPrice}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    Couleur
                  </th>
                  {!uniformPrice && (
                    <th className="px-3 py-2 text-left font-medium">
                      Prix (FCFA)
                    </th>
                  )}
                  <th className="px-3 py-2 text-left font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((c, i) => (
                  <tr
                    key={c.variantColor}
                    className={i < colors.length - 1 ? "border-b" : ""}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </div>
                    </td>
                    {!uniformPrice && (
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          disabled={isPending}
                          value={prices[c.variantColor] ?? ""}
                          onChange={(e) =>
                            setPrices((prev) => ({
                              ...prev,
                              [c.variantColor]: e.target.value,
                            }))
                          }
                          placeholder="Prix de vente"
                          className="h-8 w-28"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={isPending}
                        value={stocks[c.variantColor] ?? "0"}
                        onChange={(e) =>
                          setStocks((prev) => ({
                            ...prev,
                            [c.variantColor]: e.target.value,
                          }))
                        }
                        className="h-8 w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleSaveVariants}
            >
              {isPending
                ? "Enregistrement..."
                : "Sauvegarder stock par couleur"}
            </Button>
          </div>
        </div>
      )}

      {/* Global stock (no colors) */}
      {!hasColors && (
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
        </div>
      )}

      {/* Threshold — always visible, part of main form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="low_stock_threshold">
            Seuil d&apos;alerte stock
          </Label>
          <Input
            id="low_stock_threshold"
            name="low_stock_threshold"
            type="number"
            min={0}
            defaultValue={product.low_stock_threshold}
          />
        </div>
      </div>

      {/* Hidden stock_quantity for main form when colors handle stock */}
      {hasColors && (
        <input
          type="hidden"
          name="stock_quantity"
          value={Object.values(stocks).reduce(
            (sum, s) => sum + (parseInt(s) || 0),
            0,
          )}
        />
      )}
    </div>
  );
}

// ── Media Section ────────────────────────────────────────────────

function MediaSection({ product }: { product: ProductDetail }) {
  const [isPending, startTransition] = useTransition();

  const colorVariants = product.variants
    .map(
      (
        v,
      ): {
        variantId: string | null;
        name: string;
        hex: string;
      } | null => {
        try {
          const attrs = JSON.parse(v.attributes);
          if (!attrs.color) return null;
          const parsed = parseVariantColor(attrs.color);
          return { variantId: v.id, name: parsed.name, hex: parsed.hex };
        } catch {
          return null;
        }
      },
    )
    .filter(
      (
        c,
      ): c is { variantId: string | null; name: string; hex: string } =>
        c !== null,
    );

  const attrColors = product.attributes
    .filter((a) => a.name === "Couleur")
    .map((a) => {
      const parsed = parseColorValue(a.value);
      const variantColor = toVariantColorValue(a.value);
      const target = variantColor.toLowerCase();
      const variant = product.variants.find((v) => {
        try {
          return JSON.parse(v.attributes).color?.toLowerCase() === target;
        } catch (err) {
          console.warn(`[MediaSection] Failed to parse variant attributes for id="${v.id}":`, err);
          return false;
        }
      });
      return {
        variantId: variant?.id ?? null,
        name: parsed.name,
        hex: parsed.hex,
      };
    });

  const colors = attrColors.length > 0 ? attrColors : colorVariants;
  const hasColors = colors.length > 0;
  const generalImages = hasColors
    ? product.images.filter(
        (img) =>
          !img.variant_id ||
          !colors.some((c) => c.variantId === img.variant_id),
      )
    : product.images;

  function handleUpload(file: File, variantId?: string) {
    const formData = new FormData();
    formData.set("file", file);
    if (variantId) formData.set("variant_id", variantId);
    startTransition(async () => {
      try {
        const result = await uploadProductImage(product.id, formData);
        if (result.success) toast.success("Image ajoutée");
        else toast.error(result.error || "Erreur lors de l'upload");
      } catch (err) {
        console.error("[MediaSection] handleUpload failed:", err);
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      try {
        const result = await deleteProductImage(imageId, product.id);
        if (result.success) toast.success("Image supprimée");
        else toast.error(result.error || "Erreur lors de la suppression");
      } catch (err) {
        console.error("[MediaSection] handleDelete failed:", err);
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    startTransition(async () => {
      try {
        const result = await setPrimaryImage(imageId, product.id);
        if (result.success) toast.success("Image principale définie");
        else toast.error(result.error || "Erreur lors de la mise à jour");
      } catch (err) {
        console.error("[MediaSection] handleSetPrimary failed:", err);
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Per-color table */}
      {hasColors && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Image par couleur</h3>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    Couleur
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Image
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {colors.map((color, i) => {
                  const colorImages = color.variantId
                    ? product.images.filter(
                        (im) => im.variant_id === color.variantId,
                      )
                    : [];
                  return (
                    <tr
                      key={color.variantId ?? `color-${color.name}`}
                      className={
                        i < colors.length - 1 ? "border-b" : ""
                      }
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
                        {colorImages.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {colorImages.map((img) => (
                              <div key={img.id} className="group/img relative">
                                <Image
                                  src={getImageUrl(img.url)}
                                  alt={img.alt || color.name}
                                  width={40}
                                  height={40}
                                  className="size-10 shrink-0 rounded-md border object-cover"
                                />
                                {img.is_primary === 1 && (
                                  <Badge
                                    variant="outline"
                                    className="absolute -top-1 -right-1 px-0.5 py-0 text-[8px]"
                                  >
                                    P
                                  </Badge>
                                )}
                                <div className="absolute inset-0 hidden items-center justify-center rounded-md bg-black/50 group-hover/img:flex">
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="size-6 text-white hover:text-destructive"
                                    disabled={isPending}
                                    onClick={() => handleDelete(img.id)}
                                    aria-label="Supprimer"
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {color.variantId ? (
                            <ColorUploadBtn
                              variantId={color.variantId}
                              disabled={isPending}
                              onUpload={handleUpload}
                            />
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Sauvegardez le stock d&apos;abord
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
            {hasColors ? "Images générales" : "Images"} (
            {generalImages.length})
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
                  <Badge className="absolute left-2 top-2">
                    Principale
                  </Badge>
                )}
                <div className="touch-manipulation absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="flex w-full gap-1.5 p-2">
                    {img.is_primary !== 1 && (
                      <Button
                        type="button"
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
                      type="button"
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
    </div>
  );
}

function ColorUploadBtn({
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
        className="h-9 min-h-[44px] text-xs"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {disabled ? "Upload..." : "Télécharger"}
      </Button>
    </>
  );
}
