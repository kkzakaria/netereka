# ProductCard Mobile Actions Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the truncation hack from PR #171 (closed) with a responsive layout that stacks the product card actions vertically on mobile (icons row on top, full-width primary CTA below) while preserving the current single-row layout on tablet/desktop (sm+).

**Architecture:** Pure CSS responsive refactor using Tailwind utilities (`flex-col sm:flex-row`, `order-last sm:order-none`, `display: contents` via `sm:contents`). Two helper components (`WhatsAppProductButton`, `WishlistButtonDynamic`) gain an opt-in `className?: string` prop so the parent can drive responsive sizing without forking the components. Zero behavior change — only layout.

**Tech Stack:** Next.js 16 App Router (RSC + client components), Tailwind CSS 4 with `tailwind-merge` via `cn()`, shadcn/ui Button (CVA variants).

**Reference spec:** `docs/superpowers/specs/2026-04-16-product-card-mobile-actions-redesign.md`

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `components/storefront/whatsapp-product-button.tsx` | Modify | Add `className?: string` prop on the icon variant; merge with existing classes via `cn()`. |
| `components/storefront/wishlist-button-dynamic.tsx` | Modify | Add `className?: string` prop; forward to both internal Button (guest state) and `<WishlistButton>` (authenticated state). |
| `components/storefront/product-card-actions.tsx` | Modify | Refactor the actions `<div>`: container becomes `flex-col sm:flex-row`, icons wrapped in `flex sm:contents` sub-div, primary CTA reordered with `order-last sm:order-none`. Pass `flex-1 sm:flex-none` to icon button wrappers and `w-full sm:w-8` to the buttons inside. |

No new files. No tests added (purely visual responsive change; existing 710-test suite re-runs via pre-commit hook to guard against regressions). No changes to `wishlist-button.tsx` (already accepts `className`).

---

## Task 1: Add `className` prop to `WhatsAppProductButton` (icon variant)

**Files:**
- Modify: `components/storefront/whatsapp-product-button.tsx`

- [ ] **Step 1: Add `cn` import**

In the import block at the top of the file, after the `Button` import, add:

```tsx
import { cn } from "@/lib/utils";
```

The full import section should now read:

```tsx
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhatsAppNumber } from "@/components/storefront/whatsapp-number-provider";
```

- [ ] **Step 2: Add `className` to Props interface**

Replace:

```tsx
interface Props {
  productName: string;
  price: number;
  slug: string;
  variant?: "icon" | "full";
}
```

with:

```tsx
interface Props {
  productName: string;
  price: number;
  slug: string;
  variant?: "icon" | "full";
  className?: string;
}
```

- [ ] **Step 3: Destructure `className` in the function signature**

Replace:

```tsx
export function WhatsAppProductButton({ productName, price, slug, variant = "icon" }: Props) {
```

with:

```tsx
export function WhatsAppProductButton({ productName, price, slug, variant = "icon", className }: Props) {
```

- [ ] **Step 4: Merge `className` into the icon variant Button**

Find the icon variant return (around line 31):

```tsx
if (variant === "icon") {
  return (
    <Button size="icon-lg" variant="outline" onClick={handleClick} aria-label={`Commander sur WhatsApp: ${productName}`} className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10">
      <HugeiconsIcon icon={WhatsappIcon} size={18} />
    </Button>
  );
}
```

Replace the `className` attribute on the `<Button>` with:

```tsx
className={cn("border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10", className)}
```

The full block becomes:

```tsx
if (variant === "icon") {
  return (
    <Button
      size="icon-lg"
      variant="outline"
      onClick={handleClick}
      aria-label={`Commander sur WhatsApp: ${productName}`}
      className={cn("border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10", className)}
    >
      <HugeiconsIcon icon={WhatsappIcon} size={18} />
    </Button>
  );
}
```

The `"full"` variant (the `<button>` below) is intentionally **not** modified — only `variant="icon"` callers consume the className.

- [ ] **Step 5: Verify with grep that the prop is wired**

Run:

```bash
grep -n "className" components/storefront/whatsapp-product-button.tsx
```

Expected output (lines may differ slightly):

```text
Props interface line containing `className?: string;`
Function signature destructuring `className`
className={cn(... className)} on the icon Button
```

If any of these are missing, fix before proceeding.

---

## Task 2: Add `className` prop to `WishlistButtonDynamic` and forward to children

**Files:**
- Modify: `components/storefront/wishlist-button-dynamic.tsx`

- [ ] **Step 1: Add `cn` import**

After the `Button` import, add:

```tsx
import { cn } from "@/lib/utils";
```

The import block should now contain (in addition to the existing imports):

```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Add `className` to props and destructure it**

Replace:

```tsx
export function WishlistButtonDynamic({ productId }: { productId: string }) {
```

with:

```tsx
export function WishlistButtonDynamic({ productId, className }: { productId: string; className?: string }) {
```

- [ ] **Step 3: Forward `className` to `<WishlistButton>` (authenticated state)**

Find the authenticated-state return (around line 44):

```tsx
if (isAuthenticated && isWishlisted !== undefined) {
  return (
    <WishlistButton
      productId={productId}
      isWishlisted={isWishlisted}
      onToggled={setIsWishlisted}
    />
  );
}
```

Replace with:

```tsx
if (isAuthenticated && isWishlisted !== undefined) {
  return (
    <WishlistButton
      productId={productId}
      isWishlisted={isWishlisted}
      onToggled={setIsWishlisted}
      className={className}
    />
  );
}
```

(`WishlistButton` already accepts `className` and merges it via `cn()` — no change needed in that file.)

- [ ] **Step 4: Forward `className` to the guest-state `<Button>`**

Find the guest-state return (around line 56):

```tsx
if (!isAuthenticated) {
  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        variant="outline"
        className="hover:text-destructive hover:border-destructive/50"
        onMouseEnter={prefetchAuthDialog}
```

Replace the `className` attribute with:

```tsx
className={cn("hover:text-destructive hover:border-destructive/50", className)}
```

The Button block becomes:

```tsx
<Button
  type="button"
  size="icon-lg"
  variant="outline"
  className={cn("hover:text-destructive hover:border-destructive/50", className)}
  onMouseEnter={prefetchAuthDialog}
  onFocus={prefetchAuthDialog}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  }}
  aria-label="Ajouter aux favoris"
>
```

- [ ] **Step 5: Verify with grep**

Run:

```bash
grep -n "className" components/storefront/wishlist-button-dynamic.tsx
```

Expected: at least 3 occurrences — destructured prop, forwarded to WishlistButton, merged via cn() on guest Button.

---

## Task 3: Refactor `ProductCardActions` for responsive stacked layout

**Files:**
- Modify: `components/storefront/product-card-actions.tsx`

- [ ] **Step 1: Update the actions container `<div>` className**

Find the actions container (currently line 66-69):

```tsx
<div
  className="flex items-center gap-2 border-t px-3 py-2"
  onClick={(e) => e.stopPropagation()}
>
```

Replace the className with the responsive variant:

```tsx
<div
  className="flex flex-col gap-1.5 border-t px-3 py-2 sm:flex-row sm:items-center sm:gap-2"
  onClick={(e) => e.stopPropagation()}
>
```

**Why:** mobile = vertical stack with tight 1.5 gap; sm+ = original horizontal row with gap-2 and centered alignment.

- [ ] **Step 2: Add responsive ordering and width to the primary `<Button>`**

Find the primary Button (currently line 70-84):

```tsx
<Button
  size="lg"
  variant={isOutOfStock ? "outline" : "default"}
  disabled={isOutOfStock}
  className="flex-1"
  onClick={handleCartClick}
  aria-label={
    isOutOfStock
      ? "Rupture de stock"
      : `Ajouter ${product.name} au panier`
  }
>
  <HugeiconsIcon icon={ShoppingCart02Icon} size={16} />
  {isOutOfStock ? "Rupture de stock" : "Ajouter"}
</Button>
```

Replace the `className` with:

```tsx
className="w-full order-last sm:order-none sm:w-auto sm:flex-1"
```

The full Button becomes:

```tsx
<Button
  size="lg"
  variant={isOutOfStock ? "outline" : "default"}
  disabled={isOutOfStock}
  className="w-full order-last sm:order-none sm:w-auto sm:flex-1"
  onClick={handleCartClick}
  aria-label={
    isOutOfStock
      ? "Rupture de stock"
      : `Ajouter ${product.name} au panier`
  }
>
  <HugeiconsIcon icon={ShoppingCart02Icon} size={16} />
  {isOutOfStock ? "Rupture de stock" : "Ajouter"}
</Button>
```

**Why:** on mobile, `w-full` makes the button span the card; `order-last` pushes it to the bottom of the column flex despite being first in JSX. On sm+, `sm:order-none` resets ordering, `sm:w-auto` returns to default width, `sm:flex-1` restores original behavior.

- [ ] **Step 3: Wrap the two icon button wrappers in a sub-div with `sm:contents`**

Find the two icon button wrappers (currently lines 86-96):

```tsx
<div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
  <WhatsAppProductButton
    productName={product.name}
    price={product.base_price}
    slug={product.slug}
    variant="icon"
  />
</div>
<div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
  <WishlistButtonDynamic productId={product.id} />
</div>
```

Replace this entire block with:

```tsx
<div className="flex gap-1.5 sm:contents">
  <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
    <WhatsAppProductButton
      productName={product.name}
      price={product.base_price}
      slug={product.slug}
      variant="icon"
      className="w-full sm:w-8"
    />
  </div>
  <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
    <WishlistButtonDynamic productId={product.id} className="w-full sm:w-8" />
  </div>
</div>
```

**Why:** outer sub-div is `flex gap-1.5` on mobile (forms the icons row) but `display: contents` on sm+ (effectively unwraps itself, so the inner wrapper divs become direct children of the parent flex). Inner wrapper divs are `flex-1` on mobile (split 50/50 width) and `flex-none` on sm+ (intrinsic width = button width). Buttons inside use the new `className` prop with `w-full sm:w-8` so they fill the wrapper on mobile and explicitly restore the 32px width on sm+ — `sm:w-8` rather than `sm:w-auto` because `size-8` from the `icon-lg` CVA can't override `w-full` cleanly via `tailwind-merge` (caught during code review; see the PR commit body).

- [ ] **Step 4: Sanity check the full JSX**

Open `components/storefront/product-card-actions.tsx` and confirm the full `return` structure matches:

```tsx
return (
  <>
    <div
      className="flex flex-col gap-1.5 border-t px-3 py-2 sm:flex-row sm:items-center sm:gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        size="lg"
        variant={isOutOfStock ? "outline" : "default"}
        disabled={isOutOfStock}
        className="w-full order-last sm:order-none sm:w-auto sm:flex-1"
        onClick={handleCartClick}
        aria-label={
          isOutOfStock
            ? "Rupture de stock"
            : `Ajouter ${product.name} au panier`
        }
      >
        <HugeiconsIcon icon={ShoppingCart02Icon} size={16} />
        {isOutOfStock ? "Rupture de stock" : "Ajouter"}
      </Button>

      <div className="flex gap-1.5 sm:contents">
        <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <WhatsAppProductButton
            productName={product.name}
            price={product.base_price}
            slug={product.slug}
            variant="icon"
            className="w-full sm:w-8"
          />
        </div>
        <div className="flex-1 sm:flex-none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <WishlistButtonDynamic productId={product.id} className="w-full sm:w-8" />
        </div>
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
```

The rest of the file (imports, dynamic loaders, state, `handleCartClick`) is **unchanged**.

---

## Task 4: Pre-commit verification (catch regressions before committing)

**Files:** None (commands only)

- [ ] **Step 1: Run TypeScript type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no output (clean exit). If type errors appear, they are most likely a typo in one of the className strings or a missing prop forwarding — re-check Tasks 1-3.

- [ ] **Step 2: Run ESLint on the three modified files**

Run:

```bash
npx eslint components/storefront/whatsapp-product-button.tsx components/storefront/wishlist-button-dynamic.tsx components/storefront/product-card-actions.tsx
```

Expected: no output (clean exit).

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm run test
```

Expected: `Test Files 52 passed (52)` and `Tests 710 passed (710)`. The pre-commit hook will re-run this anyway, but doing it now isolates the failure to the change rather than the commit-message step.

If a test fails: read the failure carefully. If it's unrelated to the storefront changes (flaky test, environment issue), retry once. If it's related, return to Task 1-3 and fix.

---

## Task 5: Single commit + push branch

**Files:** None (git commands)

- [ ] **Step 1: Confirm we're on the correct branch**

Run:

```bash
git branch --show-current
```

Expected: `fix/product-card-mobile-actions-redesign`

If not, stop and ask — do not commit on the wrong branch.

- [ ] **Step 2: Stage only the three modified component files**

Run:

```bash
git add components/storefront/whatsapp-product-button.tsx components/storefront/wishlist-button-dynamic.tsx components/storefront/product-card-actions.tsx
```

**Do NOT** use `git add .` or `git add -A` — there are untracked AI-tool folders at the repo root that must not be committed (per CLAUDE.md gotcha).

- [ ] **Step 3: Verify the staged changes look right**

Run:

```bash
git diff --cached --stat
```

Expected: 3 files modified, around 30-50 lines of insertions/deletions total.

- [ ] **Step 4: Create the commit**

Run:

```bash
git commit -m "$(cat <<'EOF'
fix(storefront): redesign product card mobile actions to prevent overflow

On mobile (<sm/640px), the 2-column product grid leaves cards ~158px
wide. Three buttons on a single row (Ajouter + WhatsApp + wishlist)
overflowed because the primary button has whitespace-nowrap + shrink-0
inherited from buttonVariants and the "Rupture de stock" label is wide.

Restructure the actions row as a responsive layout: vertical stack on
mobile (icons row on top via flex-1, full-width "Ajouter au panier" on
the bottom via order-last), original single row preserved on sm+ via
display: contents trick on the icons sub-wrapper. The full label fits
in every state, the primary CTA sits in the thumb zone on mobile, and
the desktop layout is byte-for-byte unchanged.

Two helper components gain an opt-in className prop (WhatsAppProductButton
icon variant, WishlistButtonDynamic) so the parent can drive responsive
sizing without forking — their PDP usages remain visually identical.

Replaces #171 (closed) which used a min-w-0 + truncate hack that left
the label visibly cut off on small screens.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

The pre-commit hook will run tsc + eslint + vitest + migration-safety. Expected: all green, commit created.

- [ ] **Step 5: Push to origin**

Run:

```bash
git push -u origin fix/product-card-mobile-actions-redesign
```

Expected: branch pushed, GitHub URL printed for opening a PR.

---

## Task 6: Manual browser validation

**Files:** None (visual checks only)

- [ ] **Step 1: Confirm dev server is running**

The dev server was started earlier in this session on port 3000. Verify:

```bash
curl -sI http://localhost:3000 | head -1
```

Expected: `HTTP/1.1 200 OK`. If not, restart with `npm run dev` in a background bash task.

- [ ] **Step 2: Open the homepage and run through the responsive checklist**

Navigate to **http://localhost:3000** in the browser. Open DevTools (F12), enable device toolbar (Ctrl+Shift+M), then verify each of the following — at each breakpoint, look at one in-stock product and one out-of-stock product if available:

- [ ] **320px wide** (smallest mobile): three buttons fit in the card, no horizontal overflow. Icons row above, "Ajouter au panier" full width below. "Rupture de stock" displays in full (no ellipsis).
- [ ] **360px wide** (Android average): same as above.
- [ ] **375px wide** (iPhone SE / 12 mini): same as above.
- [ ] **640px wide** (sm breakpoint exact): layout switches to single row — `[Ajouter] [WA] [♥]`. No vertical stacking visible.
- [ ] **768px (md)** and **1024px (lg)** widths: single-row layout identical to before this PR.

- [ ] **Step 3: Functional spot-check**

- [ ] Click "Ajouter" on a product with no variants — item added to cart (toast or cart drawer should react).
- [ ] Click "Ajouter" on a product with variants (e.g. a phone with multiple storage options) — variant picker dialog opens.
- [ ] Click the WhatsApp icon — opens `wa.me` link in a new tab with the product context message.
- [ ] Click the wishlist icon **as a guest** (sign out first if needed) — auth dialog opens.
- [ ] Click the wishlist icon **as an authenticated customer** — heart fills/unfills, optimistic update visible.

- [ ] **Step 4: PDP non-regression**

Navigate to a product detail page (`/p/<some-slug>`). Verify:

- The standalone wishlist button next to the product title is the original size (32×32) and styling.
- The full-width "Commander sur WhatsApp" button below "Ajouter au panier" still renders in full-width green styling, not affected by the new `className` prop.

- [ ] **Step 5: Browser console check**

In DevTools console, look for any new warnings or errors — particularly hydration mismatches. Hydration mismatches on a fresh page load after this change indicate the server-rendered HTML and client HTML diverge; investigate before opening the PR.

---

## Task 7: Open the pull request

**Files:** None (gh CLI)

- [ ] **Step 1: Create the PR**

Run:

```bash
gh pr create --title "fix(storefront): redesign product card mobile actions to prevent overflow" --body "$(cat <<'EOF'
## Summary

Replaces #171 (closed) with a proper responsive refactor instead of a `min-w-0 + truncate` hack that left the label visibly cut off.

**Mobile (< sm/640px):** vertical stack — WhatsApp + wishlist icons on top (each `flex-1`, ~50% card width), "Ajouter au panier" full-width below. Primary CTA in the thumb zone, full label always visible.

**Tablette / Desktop (sm+):** unchanged — `[Ajouter (flex-1)] [WhatsApp 32px] [♥ 32px]` on a single row, byte-for-byte identical to before this PR.

CSS strategy: container `flex-col sm:flex-row`; primary button `order-last sm:order-none`; icons wrapped in a sub-div that is `flex gap-1.5` on mobile and `display: contents` on sm+ (effectively unwraps so the icons become direct flex children of the parent on desktop). Two helper components (`WhatsAppProductButton` icon variant, `WishlistButtonDynamic`) gain an opt-in `className?: string` prop so the parent can drive responsive sizing — their PDP usages remain visually identical.

Spec: \`docs/superpowers/specs/2026-04-16-product-card-mobile-actions-redesign.md\`

## Test plan

### Responsive layout
- [ ] **320px** : pas de débordement, label « Rupture de stock » entier
- [ ] **360px** : pas de débordement, label entier
- [ ] **375px** (iPhone SE / 12 mini) : pas de débordement, label entier
- [ ] **640px** : transition mobile → desktop, single-row visible
- [ ] **768px / 1024px** : layout single-row identique à \`main\`

### Interactions
- [ ] « Ajouter » sur produit sans variant → item ajouté au panier
- [ ] « Ajouter » sur produit avec variants → variant picker s'ouvre
- [ ] WhatsApp → ouvre wa.me dans un nouvel onglet
- [ ] Wishlist guest → ouvre l'auth dialog
- [ ] Wishlist authentifié → toggle optimiste

### Non-régression PDP
- [ ] Wishlist standalone à côté du titre produit : taille / style inchangés
- [ ] WhatsApp \`variant="full"\` sous « Ajouter au panier » : pleine largeur verte inchangée

### Console
- [ ] Aucun warning d'hydratation sur la home ni la PDP

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Capture and report the PR URL**

The `gh pr create` command prints the new PR URL on its last line. Report this URL to the user.

- [ ] **Step 3: Stop. Wait for explicit merge approval.**

Per project workflow rules: **never merge without explicit user approval**. Do not run `gh pr merge` or anything similar. Wait for the user to say "merge" (or equivalent).
