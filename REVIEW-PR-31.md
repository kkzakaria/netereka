# Review PR #31 — `perf: apply Vercel React best practices optimizations`

**Branch:** `perf/react-best-practices-optimizations`
**Reviewer:** Claude (Vercel React Best Practices audit)
**Verdict:** Approve with suggestions

---

## Summary

This PR applies 6 Vercel React best practices optimizations across 9 files. The changes target waterfall elimination, bundle size reduction, re-render optimization, rendering performance, and hydration UX. The overall direction is correct and well-motivated. Several issues and improvement opportunities are noted below.

---

## File-by-File Review

### 1. `actions/checkout.ts` — Parallel DB queries

**Rules applied:** `async-parallel`, `async-defer-await`

**What changed:** Products and variants queries are started early (before address resolution) and awaited later with `Promise.all()`.

**Verdict: Approve**

This is a textbook application of `async-parallel`. The two DB queries (products + variants) are independent of address resolution and delivery zone lookup, so starting them early and awaiting late is correct.

Minor observations:
- The `productsPromise` / `variantsPromise` are started at step 2, but only awaited at step 5 — after address resolution (step 3) and delivery zone lookup (step 4). This is good: if address resolution fails, the promises still run but the function returns early without needing their results.
- The `variantsPromise` correctly handles the empty case with `Promise.resolve([])`.
- Consider whether `getDeliveryZoneByCommune()` (step 4) could also be parallelized with the address resolution in the `savedAddressId` branch. Currently `zone` depends on `addressCommune` which depends on address resolution, so this is correctly sequential for the `savedAddressId` path but could be parallelized when `addressMode === "new"` (commune is already known from `data.commune`). This is a minor optimization opportunity, not blocking.

---

### 2. `app/(admin)/layout.tsx` — Dynamic import for Toaster

**Rule applied:** `bundle-dynamic-imports`

**What changed:** `Toaster` from `@/components/ui/sonner` is now loaded via `next/dynamic` with `ssr: false`.

**Verdict: Approve**

The Toaster is a client-only component (toast notifications) that does not contribute to initial render. Lazy-loading it with `ssr: false` removes it from the server-rendered HTML and the initial JS bundle, improving TTI.

The import pattern is correct:
```ts
const Toaster = nextDynamic(
  () => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false }
);
```

One suggestion: the alias `nextDynamic` is unusual — `dynamic` from `next/dynamic` is the conventional name. The rename was likely done to avoid a conflict with the `export const dynamic = "force-dynamic"` route config. This is fine but worth a comment explaining the alias to avoid confusion.

---

### 3. `components/admin/responsive-data-list.tsx` — Render callback pattern

**Rule applied:** Avoid eager rendering of inactive views (related to `rerender-memo`, `rendering-hoist-jsx`)

**What changed:** `tableView: ReactNode` prop replaced by `renderTable: (data: T[]) => ReactNode` callback. The table is only rendered when `effectiveMode === "table"`.

**Verdict: Approve with one issue**

This is a smart change. Previously, `tableView` was a JSX node that was **always** created (React calls the component function), even when the card view was active. With the callback pattern, the table component is only instantiated when needed.

**Issue — Deprecation without migration path:**
The `tableView` prop is marked `@deprecated` but both props are optional, and no runtime warning is emitted. The 4 consumer files all migrate to `renderTable`, which is correct. However, the `tableView` prop should probably be removed entirely in this PR since all callers have been migrated. Keeping a deprecated prop with no consumers adds dead code.

**Suggestion:** Remove the `tableView` prop and the fallback `renderTable ? renderTable(data) : tableView` — just use `renderTable(data)` directly. If backward compatibility is needed for external consumers (unlikely in this codebase), keep it but add a `console.warn` in development.

---

### 4. `components/admin/product-table.tsx` — Memoized rows + useCallback + content-visibility

**Rules applied:** `rerender-memo`, `rerender-functional-setstate`, `rendering-hoist-jsx`, `rendering-content-visibility`, `rendering-usetransition-loading`

**What changed:**
- Row rendering extracted into `ProductRow` wrapped with `React.memo`
- Handlers wrapped with `useCallback` with empty dependency arrays
- Static JSX (`moreIcon`) hoisted outside component
- `content-visibility: auto` applied to rows via inline styles
- `data-pending` moved from each row to the table wrapper

**Verdict: Approve with suggestions**

This is the largest and most impactful change in the PR. Several observations:

#### Good

- **`React.memo` on `ProductRow`**: Correct. When the parent re-renders (e.g., during `isPending` transitions), rows whose `product` object hasn't changed will skip re-rendering.
- **`useCallback` with `[]` deps**: The handlers use `startTransition` which captures `id` from the parameter, not from closure state. Empty deps is correct here — the callbacks are referentially stable.
- **`moreIcon` hoisted**: Good application of `rendering-hoist-jsx`. The icon JSX is static and doesn't need to be recreated.
- **`data-pending` on wrapper**: Moving it from each `<TableRow>` to the container `<div>` is cleaner and reduces DOM attribute churn.

#### Issues

1. **`content-visibility: auto` with `containIntrinsicSize: "0 56px"`**: This is applied via inline `style` attribute. While functionally correct, using a CSS class would be more maintainable and consistent with the Tailwind approach. Also, `containIntrinsicSize` should use the `contain-intrinsic-size` CSS property (kebab-case in CSS, camelCase in JSX is fine). The `0 56px` value assumes row height of 56px — verify this matches actual rendered height. If rows contain images (40px) + padding, 56px is reasonable but could be slightly off.

2. **`memo` effectiveness depends on stable `product` references**: `React.memo` does shallow comparison. If the parent component receives a new `products` array on every server action revalidation (which is typical with `revalidatePath`), each `product` object will be a new reference, making `memo` ineffective. This is the expected behavior in Next.js server-action-driven lists — `memo` will only help during `isPending` transition re-renders, not on data refreshes. This is still valuable but the benefit is limited.

3. **Missing `rerender-functional-setstate` application**: The `useCallback` handlers don't use `setState` directly — they call server actions within `startTransition`. The `rerender-functional-setstate` rule doesn't apply here since no state update depends on previous state. This is fine; just noting the rule isn't actually needed.

4. **`ProductRowData` rename from `ProductRow`**: The interface was renamed from `ProductRow` to `ProductRowData` to avoid collision with the new `ProductRow` component. This is reasonable but verify no external consumers import this type.

---

### 5. `components/storefront/checkout-form.tsx` — Skeleton loading state

**Rule applied:** `rendering-hydration-no-flicker`

**What changed:** The `if (!hydrated || items.length === 0) return null` early return is replaced with a skeleton UI showing placeholder cards.

**Verdict: Approve with suggestions**

This is a meaningful UX improvement. Previously, the checkout page showed nothing until Zustand hydrated from localStorage, causing a visible flash. The skeleton provides visual continuity.

#### Issues

1. **Skeleton shown when cart is empty**: The condition `!hydrated || items.length === 0` means the skeleton is shown both during hydration (correct) AND when the cart is empty (incorrect — the `useEffect` will redirect to `/cart`). In the empty cart case, the user briefly sees a checkout skeleton before being redirected. Consider separating the two cases:
   ```tsx
   if (!hydrated) return <CheckoutSkeleton />;
   if (items.length === 0) return null; // redirect effect will handle this
   ```

2. **Hardcoded skeleton item count**: `[1, 2].map(...)` shows 2 placeholder items. This is a reasonable default but won't match carts with 1 or 5+ items. Consider using `items.length` if available (it won't be before hydration). Since pre-hydration means no data, 2 is an acceptable approximation.

3. **Skeleton import**: The `Skeleton` component is imported from `@/components/ui/skeleton`. Verify this component exists and is lightweight — it should just be a `div` with animation classes, which is typical for shadcn.

---

### 6. Admin page client wrappers (4 files)

**Files:** `categories-page-client.tsx`, `customers-client-wrapper.tsx`, `orders-client-wrapper.tsx`, `products-page-client.tsx`

**What changed:** All switch from `tableView={<Table ... />}` to `renderTable={(data) => <Table ... />}`.

**Verdict: Approve**

Consistent migration to the new callback pattern. All 4 files follow the same pattern, which is good.

---

## Vercel Best Practices Audit — Missing Opportunities

Based on the Vercel React Best Practices guidelines, here are additional optimizations that could be considered (not blockers for this PR):

### High Impact (not addressed)

1. **`server-serialization`** — The admin pages pass full `Product`, `Order`, `Customer` objects from server to client components. These objects likely contain fields the client doesn't use (e.g., `created_at`, `updated_at`, internal IDs). Mapping to minimal DTOs before passing to client components would reduce serialization payload.

2. **`bundle-barrel-imports`** — The `@hugeicons/react` and `@hugeicons/core-free-icons` imports should be verified as tree-shakeable. Barrel file imports from icon libraries are a common bundle size problem.

3. **`async-suspense-boundaries`** — The admin layout could benefit from `<Suspense>` boundaries around the main content to enable streaming. Currently `requireAdmin()` blocks the entire layout render.

### Medium Impact (not addressed)

4. **`client-localstorage-schema`** — The Zustand cart store uses `persist` middleware with localStorage. No schema versioning is visible, which could cause issues if the cart schema evolves.

5. **`rerender-derived-state`** — In `checkout-form.tsx`, `selectedSavedAddress` is derived from `addressMode` and `selectedAddressId` on every render. This is fine for now but could be memoized if the component grows.

---

## Summary Table

| File | Rule(s) Applied | Correct? | Issues |
|------|----------------|----------|--------|
| `actions/checkout.ts` | `async-parallel` | Yes | Minor: zone lookup could be parallelized in `new` address path |
| `layout.tsx` | `bundle-dynamic-imports` | Yes | Naming: `nextDynamic` alias is unusual |
| `responsive-data-list.tsx` | Lazy rendering | Yes | Remove deprecated `tableView` prop |
| `product-table.tsx` | `rerender-memo`, `rendering-hoist-jsx`, `rendering-content-visibility` | Yes | `content-visibility` via inline style; `memo` effectiveness depends on reference stability |
| `checkout-form.tsx` | `rendering-hydration-no-flicker` | Yes | Skeleton shown during empty-cart redirect |
| Admin wrappers (×4) | Lazy rendering | Yes | None |

---

## Final Assessment

This PR demonstrates a solid understanding of the Vercel React best practices. The changes are well-targeted, correctly implemented, and the commit message clearly documents which optimizations were applied. The identified issues are minor and don't block merging.

**Recommendation: Approve**
