# Product Card Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Ajouter au panier" (left) and "Favoris" (right) buttons at the bottom of every product card, with a variant picker dialog for multi-variant products.

**Architecture:** `ProductCard` (Server Component) renders a new `ProductCardActions` client component at the bottom. For products with a single variant (or none), the cart button adds directly to the Zustand store. For multi-variant products, the button opens a `VariantPickerDialog` that lazily fetches variants via a new server action. The wishlist button reuses `WishlistButtonDynamic`.

**Tech Stack:** Next.js App Router, Zustand (`useCartStore`), better-auth (`authClient`), shadcn/ui Dialog + Button, HugeIcons, Vitest

---

### Task 1: Create `actions/variants.ts`

**Files:**
- Create: `actions/variants.ts`
- Test: `__tests__/unit/actions/variants.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/unit/actions/variants.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { getProductVariants } from "@/actions/variants";

const fakeVariant = {
  id: "var-1",
  product_id: "prod-1",
  name: "128 Go",
  sku: null,
  price: 150000,
  compare_price: null,
  stock_quantity: 5,
  attributes: "{}",
  is_active: 1,
  sort_order: 0,
};

describe("getProductVariants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne les variantes actives d'un produit", async () => {
    mocks.query.mockResolvedValue([fakeVariant]);
    const result = await getProductVariants("prod-1");
    expect(result).toEqual([fakeVariant]);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("product_id = ?"),
      ["prod-1"]
    );
  });

  it("retourne un tableau vide si aucune variante", async () => {
    mocks.query.mockResolvedValue([]);
    const result = await getProductVariants("prod-1");
    expect(result).toEqual([]);
  });

  it("retourne un tableau vide si productId invalide", async () => {
    const result = await getProductVariants("");
    expect(result).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- --run __tests__/unit/actions/variants.test.ts
```
Expected: FAIL with "Cannot find module '@/actions/variants'"

**Step 3: Write the implementation**

```ts
// actions/variants.ts
"use server";

import { z } from "zod";
import { query } from "@/lib/db";
import type { ProductVariant } from "@/lib/db/types";

const productIdSchema = z.string().min(1).max(50);

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return [];

  return query<ProductVariant>(
    "SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC, price ASC",
    [parsed.data]
  );
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- --run __tests__/unit/actions/variants.test.ts
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add actions/variants.ts "__tests__/unit/actions/variants.test.ts"
git commit -m "feat(variants): add getProductVariants server action"
```

---

### Task 2: Create `components/storefront/variant-picker-dialog.tsx`

This dialog is opened by `ProductCardActions` when a multi-variant product's cart button is clicked. It fetches variants lazily, lets the user pick one, then adds to cart and closes.

**Files:**
- Create: `components/storefront/variant-picker-dialog.tsx`

No unit test for this component (client UI with Zustand + Dialog — covered by manual/E2E testing).

**Step 1: Create the component**

```tsx
// components/storefront/variant-picker-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { ShoppingCart02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getProductVariants } from "@/actions/variants";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/db/types";
import type { ProductCardData } from "@/lib/db/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductCardData;
}

export function VariantPickerDialog({ open, onOpenChange, product }: Props) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    getProductVariants(product.id)
      .then(setVariants)
      .finally(() => setLoading(false));
  }, [open, product.id]);

  function handleAdd() {
    const variant = variants.find((v) => v.id === selected);
    if (!variant) return;
    add({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      price: variant.price,
      imageUrl: product.image_url ?? null,
      slug: product.slug,
    });
    onOpenChange(false);
  }

  const selectedVariant = variants.find((v) => v.id === selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{product.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <span className="text-sm text-muted-foreground">Chargement…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const outOfStock = v.stock_quantity <= 0;
                return (
                  <button
                    key={v.id}
                    disabled={outOfStock}
                    onClick={() => setSelected(v.id)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      "disabled:pointer-events-none disabled:opacity-40",
                      selected === v.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {v.name}
                    {outOfStock && <span className="ml-1 text-[10px]">(épuisé)</span>}
                  </button>
                );
              })}
            </div>

            {selectedVariant && (
              <p className="text-sm font-bold tabular-nums">
                {formatPrice(selectedVariant.price)}
              </p>
            )}

            <Button
              size="touch"
              className="w-full"
              disabled={!selected}
              onClick={handleAdd}
            >
              <HugeiconsIcon icon={ShoppingCart02Icon} size={18} />
              Ajouter au panier
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to the new file

**Step 3: Commit**

```bash
git add components/storefront/variant-picker-dialog.tsx
git commit -m "feat(product-card): add VariantPickerDialog for multi-variant products"
```

---

### Task 3: Create `components/storefront/product-card-actions.tsx`

Client component that renders the two action buttons at the bottom of the card.

Layout: `[+ Ajouter au panier (flex-1)]  [♡ (icon)]`

**Files:**
- Create: `components/storefront/product-card-actions.tsx`

**Step 1: Create the component**

```tsx
// components/storefront/product-card-actions.tsx
"use client";

import { useState } from "react";
import { ShoppingCart02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { WishlistButtonDynamic } from "@/components/storefront/wishlist-button-dynamic";
import { VariantPickerDialog } from "@/components/storefront/variant-picker-dialog";
import { useCartStore } from "@/stores/cart-store";
import type { ProductCardData } from "@/lib/db/types";

interface Props {
  product: ProductCardData;
}

export function ProductCardActions({ product }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const add = useCartStore((s) => s.add);

  const hasVariants = (product.variant_count ?? 0) > 1;
  const isOutOfStock = product.stock_quantity <= 0;

  function handleCartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (hasVariants) {
      setDialogOpen(true);
    } else {
      add({
        productId: product.id,
        variantId: null,
        name: product.name,
        variantName: null,
        price: product.base_price,
        imageUrl: product.image_url ?? null,
        slug: product.slug,
      });
    }
  }

  return (
    <>
      <div
        className="flex items-center gap-2 border-t px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="touch"
          variant={isOutOfStock ? "outline" : "default"}
          disabled={isOutOfStock}
          className="flex-1"
          onClick={handleCartClick}
          aria-label={
            isOutOfStock
              ? "Rupture de stock"
              : hasVariants
              ? "Choisir une variante"
              : `Ajouter ${product.name} au panier`
          }
        >
          <HugeiconsIcon icon={ShoppingCart02Icon} size={16} />
          {isOutOfStock ? "Rupture de stock" : hasVariants ? "Choisir" : "Ajouter"}
        </Button>

        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <WishlistButtonDynamic productId={product.id} />
        </div>
      </div>

      {hasVariants && (
        <VariantPickerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={product}
        />
      )}
    </>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add components/storefront/product-card-actions.tsx
git commit -m "feat(product-card): add ProductCardActions with cart and wishlist buttons"
```

---

### Task 4: Integrate `ProductCardActions` into `ProductCard`

**Files:**
- Modify: `components/storefront/product-card.tsx`

**Step 1: Add the import and render `ProductCardActions` inside the Link, after the content div**

In `components/storefront/product-card.tsx`:

1. Add import at top:
```tsx
import { ProductCardActions } from "@/components/storefront/product-card-actions";
```

2. After the closing `</div>` of the `{/* Content */}` div (line ~85), and before the closing `</Link>`, add:
```tsx
      <ProductCardActions product={product} />
```

Final structure inside `<Link>`:
```
<Link>
  {/* Image */}
  <div>...</div>

  {/* Content */}
  <div>...</div>

  <ProductCardActions product={product} />
</Link>
```

**Step 2: Verify TypeScript and lint**

```bash
npx tsc --noEmit && npm run lint
```
Expected: no errors

**Step 3: Run all tests**

```bash
npm run test
```
Expected: all tests pass (including the new variants test)

**Step 4: Commit**

```bash
git add components/storefront/product-card.tsx
git commit -m "feat(product-card): integrate cart and wishlist action buttons"
```

---

### Task 5: Create branch and open PR

**Step 1: Create branch (at start of implementation — do this first)**

```bash
git checkout -b feat/product-card-actions
```

**Step 2: After all commits, push and open PR**

```bash
git push -u origin feat/product-card-actions
gh pr create \
  --title "feat(product-card): add cart and wishlist action buttons" \
  --body "Adds 'Ajouter au panier' and favorites buttons to every product card.

## Changes
- New server action \`getProductVariants\` for lazy variant fetching
- \`VariantPickerDialog\`: modal for selecting a variant before adding to cart
- \`ProductCardActions\`: client component with cart (left) + wishlist (right) buttons
- Single-variant/no-variant products: direct add to cart
- Multi-variant products: opens variant picker dialog
- Out-of-stock: cart button disabled with label 'Rupture de stock'
- Wishlist button: reuses \`WishlistButtonDynamic\` (hidden when not logged in)"
```
