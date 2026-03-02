# Banner Drag-and-Drop Reordering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to reorder banners via drag-and-drop in the banner list table, with instant server-side save on drop.

**Architecture:** Add a `reorderBanners(orderedIds[])` Server Action (Promise.all of individual Drizzle `UPDATE`s), then transform `BannerTable` with `@dnd-kit/core` + `@dnd-kit/sortable`. The table gains a drag-handle column; local state updates optimistically on drop, and the server action fires in the background.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + D1 SQLite, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities, HugeIcons, Sonner toasts, Vitest.

---

### Task 1: Create feature branch

**Step 1: Create and switch to branch**

```bash
git checkout -b feat/banner-dnd-reorder
```

**Step 2: Verify**

```bash
git branch --show-current
```
Expected: `feat/banner-dnd-reorder`

---

### Task 2: Install @dnd-kit packages

**Files:**
- Modify: `package.json` (npm handles this)

**Step 1: Install the three packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Verify installation**

```bash
node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities'); console.log('ok')"
```
Expected: `ok`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit packages for banner drag-and-drop"
```

---

### Task 3: Add `reorderBanners` server action (TDD)

**Files:**
- Modify: `actions/admin/banners.ts`
- Modify: `__tests__/unit/actions/admin-banners.test.ts`

**Step 1: Write the failing tests**

Add this describe block at the **end** of `__tests__/unit/actions/admin-banners.test.ts`, just before the final closing brace. Also add `reorderBanners` to the existing import on line 41:

```typescript
// Change:
import {
  createBanner,
  uploadBannerImage,
  setBannerImageUrl,
  createBannerGradient,
  deleteBannerGradient,
} from "@/actions/admin/banners";

// To:
import {
  createBanner,
  uploadBannerImage,
  setBannerImageUrl,
  createBannerGradient,
  deleteBannerGradient,
  reorderBanners,
} from "@/actions/admin/banners";
```

Then append this describe block at the end of the file:

```typescript
// ─── reorderBanners ───────────────────────────────────────────────────────────

describe("reorderBanners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function makeReorderMock() {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.dbUpdate.mockReturnValue({ set: setMock });
    mocks.getDrizzle.mockResolvedValue({ update: mocks.dbUpdate });
    return { whereMock, setMock };
  }

  it("redirige si non admin (customer session)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(reorderBanners([1, 2])).rejects.toThrow("NEXT_REDIRECT");
  });

  it("tableau vide → succès sans appel DB", async () => {
    const result = await reorderBanners([]);
    expect(result.success).toBe(true);
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("met à jour display_order pour chaque ID dans le bon ordre", async () => {
    const { setMock } = makeReorderMock();

    const result = await reorderBanners([3, 1, 2]);

    expect(result.success).toBe(true);
    expect(mocks.dbUpdate).toHaveBeenCalledTimes(3);
    expect(setMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ display_order: 0 }));
    expect(setMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ display_order: 1 }));
    expect(setMock).toHaveBeenNthCalledWith(3, expect.objectContaining({ display_order: 2 }));
  });

  it("passe l'updated_at avec chaque mise à jour", async () => {
    const { setMock } = makeReorderMock();

    await reorderBanners([5]);

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/) })
    );
  });

  it("appelle where() avec l'ID correct pour chaque bannière", async () => {
    const { whereMock } = makeReorderMock();

    await reorderBanners([10, 20]);

    expect(whereMock).toHaveBeenCalledTimes(2);
  });

  it("retourne une erreur si une mise à jour DB échoue", async () => {
    const whereMock = vi.fn().mockRejectedValue(new Error("D1 error"));
    mocks.dbUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: whereMock }) });
    mocks.getDrizzle.mockResolvedValue({ update: mocks.dbUpdate });

    const result = await reorderBanners([1, 2]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("ordre");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts
```
Expected: the 6 new `reorderBanners` tests fail with "reorderBanners is not a function" or similar.

**Step 3: Implement `reorderBanners` in `actions/admin/banners.ts`**

Add this export at the **end** of `actions/admin/banners.ts`, after `deleteBannerGradient`:

```typescript
export async function reorderBanners(orderedIds: number[]): Promise<ActionResult> {
  await requireAdmin();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { success: true };
  }

  try {
    const db = await getDrizzle();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(banners).set({ display_order: index, updated_at: now }).where(eq(banners.id, id))
      )
    );

    revalidatePath("/banners");
    revalidatePath("/");
    await refreshHeroPreload();
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] reorderBanners error:", error);
    return { success: false, error: "Erreur lors de la mise à jour de l'ordre" };
  }
}
```

Note: `eq` and `revalidatePath` are already imported at the top of the file. No new imports needed.

**Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts
```
Expected: all tests pass, including the 6 new ones.

**Step 5: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add "actions/admin/banners.ts" "__tests__/unit/actions/admin-banners.test.ts"
git commit -m "feat(banners): add reorderBanners server action"
```

---

### Task 4: Implement drag-and-drop in BannerTable

**Files:**
- Modify: `components/admin/banner-table.tsx`

**Step 1: Rewrite `banner-table.tsx` with DnD**

Replace the entire contents of `components/admin/banner-table.tsx` with:

```tsx
"use client";

import { useState, useCallback, useTransition, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getImageUrl } from "@/lib/utils/images";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import {
  toggleBannerActive,
  deleteBanner,
  reorderBanners,
} from "@/actions/admin/banners";
import type { Banner } from "@/lib/db/types";

type BannerRowData = Pick<Banner, "id" | "title" | "image_url" | "display_order" | "is_active" | "starts_at" | "ends_at">;

function getBannerStatus(banner: BannerRowData): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  if (banner.is_active === 0) {
    return { label: "Inactive", variant: "secondary" };
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (banner.starts_at && banner.starts_at > now) {
    return {
      label: "Programmée",
      variant: "outline",
      className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    };
  }

  if (banner.ends_at && banner.ends_at <= now) {
    return { label: "Expirée", variant: "destructive" };
  }

  return {
    label: "Active",
    variant: "outline",
    className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "Date invalide";
  }
}

// Hoisted static elements
const imagePlaceholder = <div className="h-10 w-10 rounded bg-muted" />;
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={18} />;
const dragIcon = <HugeiconsIcon icon={DragDropVerticalIcon} size={18} />;

// Sortable row with drag handle
const SortableBannerRow = memo(function SortableBannerRow({
  banner,
  onToggleActive,
  onDelete,
}: {
  banner: BannerRowData;
  onToggleActive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const status = getBannerStatus(banner);

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell className="w-10 px-2">
        <button
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
          aria-label="Réorganiser"
        >
          {dragIcon}
        </button>
      </TableCell>
      <TableCell>
        {banner.image_url ? (
          <Image
            src={getImageUrl(banner.image_url)}
            alt={banner.title}
            width={40}
            height={40}
            className="rounded object-cover"
          />
        ) : (
          imagePlaceholder
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/banners/${banner.id}/edit`}
          className="font-medium hover:underline"
        >
          {banner.title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant} className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm font-mono">
        {banner.display_order}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
        {formatDate(banner.starts_at)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
        {formatDate(banner.ends_at)}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                {moreIcon}
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/banners/${banner.id}/edit`}>Modifier</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(banner.id)}>
                {banner.is_active === 1 ? "Désactiver" : "Activer"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  Supprimer
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette bannière ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement &quot;{banner.title}&quot;
                ainsi que son image associée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(banner.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
});

// Lightweight overlay shown while dragging (renders outside the table in a portal)
function DragOverlayRow({ banner }: { banner: BannerRowData }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-xl">
      <HugeiconsIcon icon={DragDropVerticalIcon} size={18} className="shrink-0 text-muted-foreground" />
      {banner.image_url ? (
        <Image
          src={getImageUrl(banner.image_url)}
          alt={banner.title}
          width={32}
          height={32}
          className="rounded object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted" />
      )}
      <span className="font-medium">{banner.title}</span>
    </div>
  );
}

export function BannerTable({ banners: initialBanners }: { banners: BannerRowData[] }) {
  const [items, setItems] = useState(initialBanners);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((b) => b.id === active.id);
      const newIndex = current.findIndex((b) => b.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });

    // Capture new order after state update via functional update
    setItems((current) => {
      const newOrder = current.map((b) => b.id);
      startTransition(async () => {
        try {
          const result = await reorderBanners(newOrder);
          if (!result.success) {
            toast.error(result.error || "Erreur lors de la sauvegarde de l'ordre");
          } else {
            toast.success("Ordre sauvegardé");
          }
        } catch {
          toast.error("Erreur de connexion au serveur");
        }
      });
      return current; // no additional state change
    });
  }, []);

  const handleToggleActive = useCallback((id: number) => {
    startTransition(async () => {
      try {
        const result = await toggleBannerActive(id);
        if (!result.success) toast.error(result.error || "Une erreur est survenue");
      } catch {
        toast.error("Erreur de connexion au serveur");
      }
    });
  }, []);

  const handleDelete = useCallback((id: number) => {
    startTransition(async () => {
      try {
        const result = await deleteBanner(id);
        if (result.success) {
          toast.success("Bannière supprimée");
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur");
      }
    });
  }, []);

  const activeItem = activeId !== null ? items.find((b) => b.id === activeId) ?? null : null;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucune bannière créée
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-lg border touch-manipulation" data-pending={isPending || undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden sm:table-cell">Ordre</TableHead>
              <TableHead className="hidden md:table-cell">Début</TableHead>
              <TableHead className="hidden md:table-cell">Fin</TableHead>
              <TableHead className="w-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={items.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((banner) => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </div>
      <DragOverlay>
        {activeItem ? <DragOverlayRow banner={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors.

**Step 4: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

**Step 5: Commit**

```bash
git add "components/admin/banner-table.tsx"
git commit -m "feat(banners): drag-and-drop reordering in banner list"
```

---

### Task 5: Push and open PR

**Step 1: Push branch**

```bash
git push -u origin feat/banner-dnd-reorder
```

**Step 2: Open PR**

```bash
gh pr create \
  --title "feat(banners): drag-and-drop reordering" \
  --body "$(cat <<'EOF'
## Summary

- Adds `reorderBanners(orderedIds[])` Server Action that batch-updates `display_order` (0, 1, 2…) for all banners
- Transforms `BannerTable` into a `@dnd-kit/sortable` sortable list with a drag-handle column
- Order saves instantly on drop with optimistic UI update; success/error feedback via Sonner toast
- Refreshes KV hero preload and revalidates `/` + `/banners` after every reorder

## Test plan

- [ ] Open `/banners` in admin
- [ ] Drag a banner row by its handle icon and drop it at a different position
- [ ] Verify the `Ordre` column reflects the new index immediately
- [ ] Verify a "Ordre sauvegardé" toast appears
- [ ] Refresh the page and confirm the order persisted
- [ ] Verify other actions (toggle active, delete) still work

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
