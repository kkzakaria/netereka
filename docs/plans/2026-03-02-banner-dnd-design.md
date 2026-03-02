# Banner Drag-and-Drop Reordering — Design

**Date:** 2026-03-02
**Status:** Approved

## Problem

The banner list in the admin shows a `display_order` column but order can only be changed by editing each banner individually. There is no way to quickly reorder banners visually.

## Goal

Allow admins to reorder banners via drag-and-drop directly in the banner list table. Order is saved instantly on drop.

## Approach

`@dnd-kit/sortable` — lightweight (~12 KB), accessible (keyboard + touch), actively maintained, works well with React table rows.

## Architecture

### New Server Action

`reorderBanners(orderedIds: number[]): Promise<ActionResult>` in `actions/admin/banners.ts`.

- Receives the banner IDs in their new order
- Batch-updates `display_order` as 0, 1, 2… (compact reassignment)
- Calls `revalidatePath("/banners")`, `revalidatePath("/")`, and `refreshHeroPreload()`

### BannerTable

- Maintains local `items` state (optimistic copy of the list)
- On drop: updates local state immediately, fires `reorderBanners` in a `startTransition`
- On error: shows an error toast (no rollback — rare case, acceptable)
- The `Ordre` column remains visible and reflects the saved index

## Components

| Component | Role |
|---|---|
| `BannerTable` | Wraps table with `DndContext` + `SortableContext` |
| `SortableBannerRow` | `useSortable` wrapper around existing `BannerRow` |
| `DragOverlay` | Floating clone of the row shown during drag |

### Column changes

- New leftmost column: drag handle (`DragDropVerticalIcon` from HugeIcons), `cursor-grab`
- `SortableBannerRow` applies `transform`, `transition`, and `opacity: 0.5` when `isDragging`

## Interaction Flow

1. User grabs the handle → row lifts (shadow + 80% opacity)
2. User drags → other rows animate to new positions in real time
3. User drops → local order updates instantly; server action fires in background
4. Success: subtle toast "Ordre sauvegardé"
5. Error: error toast; UI keeps the new order (optimistic, no rollback)

## Dependencies to Install

```
@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Files to Change

| File | Change |
|---|---|
| `package.json` | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `actions/admin/banners.ts` | Add `reorderBanners` server action |
| `components/admin/banner-table.tsx` | Add DnD logic, drag handle column, `SortableBannerRow` |
