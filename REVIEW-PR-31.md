# Review PR #31 — `perf: apply Vercel React best practices optimizations`

**Branch:** `perf/react-best-practices-optimizations`
**Reviewer:** Claude (Vercel React Best Practices audit)
**Revision:** v2 (re-review after fixes)
**Verdict:** Approve

---

## Summary

This PR applies 6 Vercel React best practices optimizations across 9 files. The changes target waterfall elimination, bundle size reduction, re-render optimization, rendering performance, and hydration UX.

After v1 review, 3 issues were raised. All 3 have been addressed in commit `e7a3deb`:
- ~~`tableView` deprecated prop not removed~~ → Removed, `renderTable` is now required
- ~~Skeleton shown during empty-cart redirect~~ → Separated: `!hydrated` → skeleton, `items.length === 0` → `null`
- ~~`nextDynamic` alias unexplained~~ → Comment added explaining the naming conflict

---

## File-by-File Review

### 1. `actions/checkout.ts` — Parallel DB queries

**Rules applied:** `async-parallel`, `async-defer-await`

**What changed:** Products and variants queries are started early (before address resolution) and awaited later with `Promise.all()`.

**Verdict: Approve**

Textbook application of `async-parallel`. The two DB queries are independent of address resolution and delivery zone lookup. Starting them early and awaiting late is correct.

- `productsPromise` / `variantsPromise` started at step 2, awaited at step 5 — address resolution (step 3) and zone lookup (step 4) run in between.
- `variantsPromise` correctly handles the empty case with `Promise.resolve([])`.
- Minor future optimization: `getDeliveryZoneByCommune()` could be parallelized with address resolution in the `new` address path (commune is already known).

---

### 2. `app/(admin)/layout.tsx` — Dynamic import for Toaster

**Rule applied:** `bundle-dynamic-imports`

**Verdict: Approve**

Toaster is client-only and not needed for initial render. `next/dynamic` with `ssr: false` is correct. The `nextDynamic` alias now has a clear comment explaining the conflict with `export const dynamic = "force-dynamic"`.

---

### 3. `components/admin/responsive-data-list.tsx` — Render callback pattern

**Rule applied:** Avoid eager rendering of inactive views

**Verdict: Approve** (v1 issue resolved)

The deprecated `tableView` prop and its fallback logic have been removed. `renderTable` is now a required prop with a clean type signature:

```ts
interface ResponsiveDataListProps<T> {
  data: T[];
  renderTable: (data: T[]) => ReactNode;  // required, no fallback
  renderCard: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}
```

The rendering path is now simply `renderTable(data)` — no optional chaining, no dead code.

---

### 4. `components/admin/product-table.tsx` — Memoized rows + useCallback + content-visibility

**Rules applied:** `rerender-memo`, `rendering-hoist-jsx`, `rendering-content-visibility`

**Verdict: Approve** (no changes in v2, prior notes still apply as informational)

Remaining non-blocking observations:
- `content-visibility: auto` applied via inline `style` — a Tailwind utility class would be more consistent, but functionally equivalent.
- `React.memo` effectiveness is limited to `isPending` transition re-renders (product references change on data revalidation). This is the expected and correct trade-off.
- `ProductRowData` rename avoids collision with the `ProductRow` component. No external consumers of this type exist.

---

### 5. `components/storefront/checkout-form.tsx` — Skeleton loading state

**Rule applied:** `rendering-hydration-no-flicker`

**Verdict: Approve** (v1 issue resolved)

The two cases are now correctly separated:

```tsx
if (!hydrated) {
  return <SkeletonUI />;  // show skeleton during Zustand hydration
}

if (items.length === 0) return null;  // redirect effect handles navigation
```

This prevents showing a checkout skeleton to users with an empty cart who are about to be redirected to `/cart`.

---

### 6. Admin page client wrappers (4 files)

**Verdict: Approve**

All 4 consumers consistently migrated to the `renderTable` callback pattern.

---

## Vercel Best Practices Audit — Remaining Opportunities (future PRs)

| Priority | Rule | Suggestion |
|----------|------|------------|
| HIGH | `server-serialization` | Pass minimal DTOs to client components instead of full DB objects |
| HIGH | `bundle-barrel-imports` | Verify `@hugeicons` imports are tree-shakeable |
| HIGH | `async-suspense-boundaries` | Add `<Suspense>` in admin layout for streaming |
| MEDIUM | `client-localstorage-schema` | Add schema versioning to Zustand cart persist |

---

## Summary Table

| File | Rule(s) Applied | Status |
|------|----------------|--------|
| `actions/checkout.ts` | `async-parallel` | Approved |
| `layout.tsx` | `bundle-dynamic-imports` | Approved (comment added) |
| `responsive-data-list.tsx` | Lazy rendering | Approved (deprecated prop removed) |
| `product-table.tsx` | `rerender-memo`, `rendering-hoist-jsx`, `rendering-content-visibility` | Approved |
| `checkout-form.tsx` | `rendering-hydration-no-flicker` | Approved (skeleton/empty separated) |
| Admin wrappers (x4) | Lazy rendering | Approved |

---

## Final Assessment

All 3 issues from v1 have been correctly resolved. The PR is clean, well-structured, and correctly applies 6 Vercel React best practices across the codebase.

**Recommendation: Approve — ready to merge**
