# Guided Product Form — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat product creation form and tabbed edit page with a unified sectioned form featuring scroll spy navigation and cascading category/subcategory selector.

**Architecture:** The new product page creates a draft product (is_draft=1) server-side, then redirects to the edit page with `?new=1`. The edit page renders a sectioned form with a sticky side nav. Categories use a cascading two-dropdown pattern. ImageManager and VariantList are reused as-is.

**Tech Stack:** Next.js App Router, shadcn/ui (Card, Select, Switch, Input, Textarea), IntersectionObserver for scroll spy, Zod for validation, raw SQL via lib/db helpers.

---

### Task 1: DB migration — add `is_draft` column to products

**Files:**
- Create: `db/migrations/0009_add_product_is_draft.sql`
- Modify: `lib/db/schema.ts:136-161`

**Step 1: Create the SQL migration file**

```sql
-- db/migrations/0009_add_product_is_draft.sql
ALTER TABLE products ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0;
```

**Step 2: Update Drizzle schema**

In `lib/db/schema.ts`, add `is_draft` to the products table definition, right after `is_featured`:

```typescript
// Add after line 148 (is_featured):
is_draft: integer("is_draft").notNull().default(0),
```

**Step 3: Update `Product` interface in `lib/db/types.ts`**

Add these fields to the `Product` interface (they exist in DB but are missing from the TS type):

```typescript
// Add after stock_quantity in the Product interface (after line 26):
low_stock_threshold: number;
weight_grams: number | null;
meta_title: string | null;
meta_description: string | null;
is_draft: number;
```

**Step 4: Run the migration locally**

Run: `npx wrangler d1 execute netereka-db --local --file=db/migrations/0009_add_product_is_draft.sql`
Expected: Migration applied successfully.

**Step 5: Commit**

```bash
git add db/migrations/0009_add_product_is_draft.sql lib/db/schema.ts lib/db/types.ts
git commit -m "feat: add is_draft column to products table"
```

---

### Task 2: Update server actions — new fields, draft creation, cleanup

**Files:**
- Modify: `actions/admin/products.ts`

**Step 1: Update productSchema with new fields**

In `actions/admin/products.ts`, update the `productSchema` Zod object to add the 4 new fields:

```typescript
const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  description: z.string().optional().default(""),
  short_description: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  weight_grams: z.coerce.number().int().min(0).optional(),
  meta_title: z.string().optional().default(""),
  meta_description: z.string().optional().default(""),
  is_active: z.coerce.number().min(0).max(1).default(1),
  is_featured: z.coerce.number().min(0).max(1).default(0),
});
```

**Step 2: Update `createProduct` INSERT to include new fields**

Update the INSERT statement in `createProduct()` to include the new columns:

```typescript
await execute(
  `INSERT INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity, low_stock_threshold, weight_grams, meta_title, meta_description, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  [
    id,
    data.category_id,
    data.name,
    data.slug,
    data.description || null,
    data.short_description || null,
    data.base_price,
    data.compare_price ?? null,
    data.sku || null,
    data.brand || null,
    data.is_active,
    data.is_featured,
    data.stock_quantity,
    data.low_stock_threshold,
    data.weight_grams ?? null,
    data.meta_title || null,
    data.meta_description || null,
  ]
);
```

**Step 3: Update `updateProduct` SET to include new fields and handle is_draft**

Update the UPDATE statement in `updateProduct()`:

```typescript
await execute(
  `UPDATE products SET
     category_id = ?, name = ?, slug = ?, description = ?, short_description = ?,
     base_price = ?, compare_price = ?, sku = ?, brand = ?,
     is_active = ?, is_featured = ?, stock_quantity = ?,
     low_stock_threshold = ?, weight_grams = ?, meta_title = ?, meta_description = ?,
     is_draft = 0, updated_at = datetime('now')
   WHERE id = ?`,
  [
    data.category_id,
    data.name,
    data.slug,
    data.description || null,
    data.short_description || null,
    data.base_price,
    data.compare_price ?? null,
    data.sku || null,
    data.brand || null,
    data.is_active,
    data.is_featured,
    data.stock_quantity,
    data.low_stock_threshold,
    data.weight_grams ?? null,
    data.meta_title || null,
    data.meta_description || null,
    id,
  ]
);
```

Note: `is_draft = 0` is hardcoded — any save via updateProduct publishes the draft.

**Step 4: Add `createDraftProduct` server action**

Add at the end of `actions/admin/products.ts`:

```typescript
export async function createDraftProduct(): Promise<ActionResult> {
  await requireAdmin();

  const id = nanoid();
  const slug = `draft-${id}`;

  await execute(
    `INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, created_at, updated_at)
     VALUES (?, '', '', ?, 0, 0, 1, datetime('now'), datetime('now'))`,
    [id, slug]
  );

  return { success: true, id };
}
```

**Step 5: Add `cleanupDraftProducts` server action**

Add at the end of `actions/admin/products.ts`:

```typescript
export async function cleanupDraftProducts(): Promise<void> {
  await requireAdmin();

  // Delete orphaned drafts older than 24 hours with no name set
  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();

  const orphanedDrafts = await query<{ id: string }>(
    `SELECT id FROM products
     WHERE is_draft = 1 AND name = ''
     AND created_at < datetime('now', '-24 hours')`
  );

  for (const draft of orphanedDrafts) {
    await db.batch([
      db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(draft.id),
      db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(draft.id),
      db.prepare("DELETE FROM products WHERE id = ?").bind(draft.id),
    ]);
  }
}
```

**Step 6: Commit**

```bash
git add actions/admin/products.ts
git commit -m "feat: add new product fields, draft creation, and cleanup actions"
```

---

### Task 3: Filter drafts from product listing and storefront

**Files:**
- Modify: `lib/db/admin/products.ts:26-49` (buildFilterClause)
- Modify: `app/(admin)/products/page.tsx` (call cleanup)

**Step 1: Add `is_draft = 0` filter to admin product queries**

In `lib/db/admin/products.ts`, update `buildFilterClause()` to always exclude drafts. Add at the top of the function body:

```typescript
function buildFilterClause(opts: AdminProductFilters): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = ["p.is_draft = 0"];
  const params: unknown[] = [];

  // ... rest unchanged
```

This replaces the current `const conditions: string[] = [];`.

**Step 2: Trigger cleanup on product list page load**

In `app/(admin)/products/page.tsx`, import and call cleanup. Add at the top of `ProductsPage()`:

```typescript
import { cleanupDraftProducts } from "@/actions/admin/products";

// Inside ProductsPage, before the existing parallel fetches:
// Fire-and-forget cleanup (don't block page load)
cleanupDraftProducts().catch(() => {});
```

**Step 3: Verify storefront queries also filter drafts**

Check that storefront product queries (in `lib/db/products.ts` or similar) already filter by `is_active = 1`. Since drafts have `is_active = 0`, they're already hidden from the storefront. No change needed.

**Step 4: Commit**

```bash
git add lib/db/admin/products.ts "app/(admin)/products/page.tsx"
git commit -m "feat: filter draft products from admin listing"
```

---

### Task 4: Build `CategoryCascadingSelect` component

**Files:**
- Create: `components/admin/category-cascading-select.tsx`

**Step 1: Create the cascading category selector component**

```typescript
"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryWithCount } from "@/lib/db/admin/categories";

interface CategoryCascadingSelectProps {
  categories: CategoryWithCount[];
  defaultCategoryId?: string;
}

export function CategoryCascadingSelect({
  categories,
  defaultCategoryId,
}: CategoryCascadingSelectProps) {
  const roots = categories.filter((c) => c.depth === 0);
  const childrenByParent = new Map<string, CategoryWithCount[]>();
  for (const cat of categories) {
    if (cat.parent_id) {
      const existing = childrenByParent.get(cat.parent_id) ?? [];
      existing.push(cat);
      childrenByParent.set(cat.parent_id, existing);
    }
  }

  // Determine initial state from defaultCategoryId
  let initialParentId = "";
  let initialSubcategoryId = "";
  if (defaultCategoryId) {
    const cat = categories.find((c) => c.id === defaultCategoryId);
    if (cat) {
      if (cat.depth === 0) {
        initialParentId = cat.id;
      } else if (cat.parent_id) {
        initialParentId = cat.parent_id;
        initialSubcategoryId = cat.id;
      }
    }
  }

  const [parentId, setParentId] = useState(initialParentId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);

  const subcategories = parentId ? (childrenByParent.get(parentId) ?? []) : [];
  const hasSubcategories = subcategories.length > 0;

  // The actual category_id submitted is the subcategory if selected, otherwise the parent
  const effectiveCategoryId = hasSubcategories
    ? subcategoryId || ""
    : parentId;

  function handleParentChange(value: string) {
    setParentId(value);
    setSubcategoryId(""); // Reset subcategory when parent changes
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="category_id" value={effectiveCategoryId} />

      <div className="space-y-2">
        <Label htmlFor="parent-category">Catégorie</Label>
        <Select value={parentId || undefined} onValueChange={handleParentChange}>
          <SelectTrigger id="parent-category">
            <SelectValue placeholder="Choisir une catégorie…" />
          </SelectTrigger>
          <SelectContent>
            {roots.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasSubcategories && (
        <div className="space-y-2">
          <Label htmlFor="subcategory">Sous-catégorie</Label>
          <Select
            value={subcategoryId || undefined}
            onValueChange={setSubcategoryId}
          >
            <SelectTrigger id="subcategory">
              <SelectValue placeholder="Choisir une sous-catégorie…" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/category-cascading-select.tsx
git commit -m "feat: add cascading category selector component"
```

---

### Task 5: Build `SectionNav` scroll spy component

**Files:**
- Create: `components/admin/section-nav.tsx`

**Step 1: Create the sticky side navigation with scroll spy**

```typescript
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SectionDef {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionDef[];
  submitLabel: string;
  isPending: boolean;
}

export function SectionNav({ sections, submitLabel, isPending }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first section that is intersecting
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="sticky top-20 space-y-4">
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "block w-full rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors",
              activeSection === section.id
                ? "border-primary bg-primary/5 font-medium text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : submitLabel}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/section-nav.tsx
git commit -m "feat: add scroll spy section navigation component"
```

---

### Task 6: Build `ProductFormSections` — the main sectioned form

**Files:**
- Create: `components/admin/product-form-sections.tsx`

This is the largest component. It replaces both `ProductForm` (used in creation) and the tabbed layout (used in editing).

**Step 1: Create the component**

```typescript
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
          // Remove ?new=1 from URL after successful creation
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
              <CardTitle>Tarification & Stock</CardTitle>
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
```

**Step 2: Commit**

```bash
git add components/admin/product-form-sections.tsx
git commit -m "feat: add sectioned product form component"
```

---

### Task 7: Update pages — new product creates draft, edit uses sections

**Files:**
- Modify: `app/(admin)/products/new/page.tsx`
- Modify: `app/(admin)/products/[id]/edit/page.tsx`

**Step 1: Rewrite the new product page to create a draft and redirect**

Replace the entire content of `app/(admin)/products/new/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createDraftProduct } from "@/actions/admin/products";

export default async function NewProductPage() {
  const result = await createDraftProduct();

  if (result.success && result.id) {
    redirect(`/products/${result.id}/edit?new=1`);
  }

  // Fallback — should not happen
  redirect("/products");
}
```

**Step 2: Rewrite the edit product page to use sectioned form**

Replace the entire content of `app/(admin)/products/[id]/edit/page.tsx`:

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductFormSections } from "@/components/admin/product-form-sections";
import { getAdminProductById } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNewParam } = await searchParams;
  const isNew = isNewParam === "1";

  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAllCategories(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux produits"
          >
            <Link href="/products">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {isNew ? "Nouveau produit" : product.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Créer un produit" : "Modifier le produit"}
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <ProductFormSections
        product={product}
        categories={categories}
        isNew={isNew}
      />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add "app/(admin)/products/new/page.tsx" "app/(admin)/products/[id]/edit/page.tsx"
git commit -m "feat: integrate sectioned form into product pages"
```

---

### Task 8: Clean up old ProductForm component

**Files:**
- Modify: `components/admin/product-form.tsx` — delete file (no longer imported)

**Step 1: Verify no other files import ProductForm**

Run: `grep -r "ProductForm" --include="*.tsx" --include="*.ts" -l`

Expected: Only `product-form.tsx` itself (and possibly test files). The old imports in `new/page.tsx` and `edit/page.tsx` have been replaced in Task 7.

**Step 2: Delete the old component**

```bash
rm components/admin/product-form.tsx
```

**Step 3: Commit**

```bash
git add components/admin/product-form.tsx
git commit -m "refactor: remove old ProductForm replaced by ProductFormSections"
```

---

### Task 9: Type check, lint, test, and final verification

**Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors. Fix any type issues.

**Step 2: Run ESLint**

Run: `npm run lint`
Expected: No errors. Fix any lint issues.

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass.

**Step 4: If all checks pass, final commit for any fixes**

If there were type/lint fixes needed:
```bash
git add -A
git commit -m "fix: resolve type and lint issues from product form refactor"
```

---

### Task 10: Create PR

**Step 1: Create feature branch and push**

All commits so far are on main — create a branch, cherry-pick, and push:

```bash
git checkout -b feat/guided-product-form
git push -u origin feat/guided-product-form
```

**Step 2: Create PR**

```bash
gh pr create --title "feat: guided sectioned product form with cascading categories" --body "$(cat <<'EOF'
## Summary
- Replaces flat product creation form and tabbed edit page with unified sectioned form
- Adds scroll spy side navigation for quick section jumping
- Implements cascading category/subcategory selector
- Exposes 4 new fields: low_stock_threshold, weight_grams, meta_title, meta_description
- Auto-creates draft products for immediate image/variant support during creation
- Cleans up orphaned drafts older than 24h on product list page load

## Test plan
- [ ] Navigate to /admin/products/new — should create draft and redirect to edit with ?new=1
- [ ] Verify scroll spy highlights active section while scrolling
- [ ] Select a parent category with subcategories — verify subcategory dropdown appears
- [ ] Select a parent category without subcategories — verify no subcategory dropdown
- [ ] Upload images and add variants during new product creation
- [ ] Submit the form — verify product is created (is_draft=0) with all fields
- [ ] Edit an existing product — verify all sections pre-populated correctly
- [ ] Verify product list does not show draft products
- [ ] Verify mobile layout (single column, no side nav, submit button at bottom)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
