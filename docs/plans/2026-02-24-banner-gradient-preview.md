# Banner Gradient Preview — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter prévisualisation temps réel, 6 prédégradés codés en dur et sauvegarde de dégradés personnalisés (table D1) dans le formulaire de création/édition de bannières admin.

**Architecture:** `BannerForm` devient contrôlé (React state pour les champs visuels). Un composant `GradientPicker` remplace les deux color pickers natifs et gère présets + sauvegarde. Un composant `BannerPreview` dans la sidebar sticky affiche le rendu live. Les dégradés personnalisés sont stockés en D1 via deux nouvelles Server Actions et chargés côté serveur (RSC) avant d'être passés en props.

**Tech Stack:** Next.js App Router, Drizzle ORM + D1 SQLite, Zod, Vitest, shadcn/ui (Dialog, Input, Button), React `useTransition`, Tailwind CSS 4

---

## Task 1: Ajouter la table `banner_gradients` en DB

**Files:**
- Modify: `lib/db/schema.ts` (après le bloc `banners`, ligne ~372)

**Step 1: Ajouter la définition de table dans le schéma Drizzle**

Ouvrir `lib/db/schema.ts`. Après la fermeture de la table `banners` (ligne ~372), ajouter :

```ts
// =============================================================================
// Banner Gradients (saved presets)
// =============================================================================
export const bannerGradients = sqliteTable("banner_gradients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color_from: text("color_from").notNull(),
  color_to: text("color_to").notNull(),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
});
```

**Step 2: Générer la migration SQL**

```bash
npm run db:generate
```

Expected: un nouveau fichier `drizzle/XXXX_add_banner_gradients.sql` est créé.

**Step 3: Vérifier le contenu du fichier SQL généré**

Il doit contenir :
```sql
CREATE TABLE `banner_gradients` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `color_from` text NOT NULL,
  `color_to` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);
```

**Step 4: Appliquer la migration localement**

```bash
npm run db:migrate
```

Expected: `Applied migration: XXXX_add_banner_gradients.sql`

**Step 5: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(db): add banner_gradients table for saved gradient presets"
```

---

## Task 2: Ajouter le type `BannerGradient` et le helper DB

**Files:**
- Modify: `lib/db/types.ts` (après l'interface `Banner`, ligne ~358)
- Modify: `lib/db/admin/banners.ts`

**Step 1: Ajouter l'interface dans `lib/db/types.ts`**

Après la fermeture de l'interface `Banner` (ligne ~358), ajouter :

```ts
export interface BannerGradient {
  id: number;
  name: string;
  color_from: string;
  color_to: string;
  created_at: string;
}
```

**Step 2: Ajouter `getSavedGradients()` dans `lib/db/admin/banners.ts`**

Ajouter en haut du fichier l'import :
```ts
import { bannerGradients } from "@/lib/db/schema";
import type { Banner, BannerGradient } from "@/lib/db/types";
```
(remplace le `import type { Banner }` existant)

Ajouter en bas du fichier :
```ts
export async function getSavedGradients(): Promise<BannerGradient[]> {
  const db = await getDrizzle();
  return db.select().from(bannerGradients).orderBy(asc(bannerGradients.id)) as unknown as BannerGradient[];
}
```

**Step 3: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add lib/db/types.ts lib/db/admin/banners.ts
git commit -m "feat(types): add BannerGradient type and getSavedGradients DB helper"
```

---

## Task 3: Server Actions `createBannerGradient` et `deleteBannerGradient` (TDD)

**Files:**
- Modify: `__tests__/unit/actions/admin-banners.test.ts`
- Modify: `actions/admin/banners.ts`

**Step 1: Étendre le fichier de tests**

Dans `__tests__/unit/actions/admin-banners.test.ts`, modifier le bloc `vi.hoisted` pour ajouter `dbInsert` et `dbDelete` :

```ts
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  uploadToR2: vi.fn(),
  deleteFromR2: vi.fn(),
  findFirst: vi.fn(),
  dbUpdate: vi.fn(),
  dbInsert: vi.fn(),
  dbDelete: vi.fn(),
  getDrizzle: vi.fn(),
}));
```

Modifier la ligne d'import des actions en bas du bloc de mocks :
```ts
import {
  uploadBannerImage,
  setBannerImageUrl,
  createBannerGradient,
  deleteBannerGradient,
} from "@/actions/admin/banners";
```

Ajouter à la fin du fichier les deux nouveaux blocs `describe` :

```ts
// ─── createBannerGradient ─────────────────────────────────────────────────────

describe("createBannerGradient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function mockInsertSuccess(overrides: Partial<{ id: number; name: string; color_from: string; color_to: string }> = {}) {
    const row = {
      id: 1,
      name: "Mon dégradé",
      color_from: "#7C3AED",
      color_to: "#EC4899",
      created_at: "2026-02-24 00:00:00",
      ...overrides,
    };
    const returningMock = vi.fn().mockResolvedValue([row]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    mocks.dbInsert.mockReturnValue({ values: valuesMock });
    mocks.getDrizzle.mockResolvedValue({ insert: mocks.dbInsert });
    return row;
  }

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      createBannerGradient({ name: "Test", color_from: "#000000", color_to: "#ffffff" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette un name vide", async () => {
    const result = await createBannerGradient({ name: "", color_from: "#000000", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("nom");
  });

  it("rejette une couleur invalide (color_from)", async () => {
    const result = await createBannerGradient({ name: "Test", color_from: "not-a-color", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("couleur");
  });

  it("rejette une couleur invalide (color_to)", async () => {
    const result = await createBannerGradient({ name: "Test", color_from: "#000000", color_to: "rgb(0,0,0)" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("couleur");
  });

  it("crée le gradient et retourne l'objet créé", async () => {
    const row = mockInsertSuccess({ name: "Violet Coucher", color_from: "#7C3AED", color_to: "#EC4899" });
    const result = await createBannerGradient({
      name: "Violet Coucher",
      color_from: "#7C3AED",
      color_to: "#EC4899",
    });
    expect(result.success).toBe(true);
    expect(result.gradient).toMatchObject({
      id: row.id,
      name: row.name,
      color_from: row.color_from,
      color_to: row.color_to,
    });
  });

  it("retourne une erreur si l'insertion DB échoue", async () => {
    mocks.getDrizzle.mockResolvedValue({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("D1 error")),
        }),
      }),
    });
    const result = await createBannerGradient({ name: "Test", color_from: "#000000", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── deleteBannerGradient ─────────────────────────────────────────────────────

describe("deleteBannerGradient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function mockDeleteSuccess() {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    mocks.dbDelete.mockReturnValue({ where: whereMock });
    mocks.getDrizzle.mockResolvedValue({ delete: mocks.dbDelete });
    return whereMock;
  }

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(deleteBannerGradient(1)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette id = 0", async () => {
    const result = await deleteBannerGradient(0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID");
  });

  it("rejette id négatif", async () => {
    const result = await deleteBannerGradient(-3);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID");
  });

  it("supprime le gradient avec succès", async () => {
    mockDeleteSuccess();
    const result = await deleteBannerGradient(5);
    expect(result.success).toBe(true);
    expect(mocks.dbDelete).toHaveBeenCalled();
  });

  it("retourne une erreur si la suppression DB échoue", async () => {
    mocks.dbDelete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("D1 delete error")),
    });
    mocks.getDrizzle.mockResolvedValue({ delete: mocks.dbDelete });
    const result = await deleteBannerGradient(5);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

**Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts
```

Expected: les `describe` blocks `createBannerGradient` et `deleteBannerGradient` échouent avec "not a function" ou import error.

**Step 3: Implémenter les deux actions dans `actions/admin/banners.ts`**

Ajouter en haut du fichier l'import :
```ts
import { banners, bannerGradients } from "@/lib/db/schema";
```
(remplace `import { banners } from "@/lib/db/schema"`)

Ajouter l'import du type :
```ts
import type { ActionResult } from "@/lib/utils";
import type { BannerGradient } from "@/lib/db/types";
```

Ajouter à la fin du fichier :

```ts
const gradientSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  color_from: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format: #RRGGBB)"),
  color_to: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format: #RRGGBB)"),
});

export async function createBannerGradient(
  input: { name: string; color_from: string; color_to: string }
): Promise<ActionResult & { gradient?: BannerGradient }> {
  await requireAdmin();

  const parsed = gradientSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return { success: false, error: msg };
  }

  try {
    const db = await getDrizzle();
    const rows = await db.insert(bannerGradients).values({
      name: parsed.data.name,
      color_from: parsed.data.color_from,
      color_to: parsed.data.color_to,
    }).returning({
      id: bannerGradients.id,
      name: bannerGradients.name,
      color_from: bannerGradients.color_from,
      color_to: bannerGradients.color_to,
      created_at: bannerGradients.created_at,
    });

    const gradient = rows[0];
    if (!gradient) {
      return { success: false, error: "Échec de la création du dégradé" };
    }

    return { success: true, gradient: gradient as BannerGradient };
  } catch (error) {
    console.error("[admin/banners] createBannerGradient error:", error);
    return { success: false, error: "Erreur lors de la création du dégradé" };
  }
}

export async function deleteBannerGradient(id: number): Promise<ActionResult> {
  await requireAdmin();

  if (!id || id <= 0) return { success: false, error: "ID de dégradé invalide" };

  try {
    const db = await getDrizzle();
    await db.delete(bannerGradients).where(eq(bannerGradients.id, id));
    return { success: true };
  } catch (error) {
    console.error("[admin/banners] deleteBannerGradient error:", error);
    return { success: false, error: "Erreur lors de la suppression du dégradé" };
  }
}
```

**Step 4: Lancer les tests**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts
```

Expected: tous les tests passent.

**Step 5: Commit**

```bash
git add actions/admin/banners.ts "__tests__/unit/actions/admin-banners.test.ts"
git commit -m "feat(actions): add createBannerGradient and deleteBannerGradient server actions"
```

---

## Task 4: Composant `BannerPreview`

**Files:**
- Create: `components/admin/banner-preview.tsx`

**Step 1: Créer le composant**

Créer `components/admin/banner-preview.tsx` :

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import type { BadgeColor } from "@/lib/db/types";

interface BannerPreviewProps {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: BadgeColor;
  price: number | null;
  imageUrl: string | null;
  bgFrom: string;
  bgTo: string;
  ctaText: string;
}

const badgeColorMap: Record<BadgeColor, string> = {
  mint: "bg-emerald-500/20 text-emerald-300",
  red: "bg-red-500/20 text-red-300",
  orange: "bg-orange-500/20 text-orange-300",
  blue: "bg-blue-500/20 text-blue-300",
};

export function BannerPreview({
  title,
  subtitle,
  badgeText,
  badgeColor,
  price,
  imageUrl,
  bgFrom,
  bgTo,
  ctaText,
}: BannerPreviewProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Prévisualisation
      </p>
      <div
        className="relative h-[170px] overflow-hidden rounded-xl"
        style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#00FF9C]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />

        <div className="grid h-full grid-cols-2 items-center gap-2 px-3 py-3">
          {/* Text glass card */}
          <div className="rounded-lg border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-xl">
            {badgeText && (
              <span
                className={cn(
                  "mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  badgeColorMap[badgeColor]
                )}
              >
                {badgeText}
              </span>
            )}
            <p className="text-xs font-bold leading-tight text-white line-clamp-2">
              {title || "Titre de la bannière"}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[10px] text-white/70 line-clamp-1">
                {subtitle}
              </p>
            )}
            {price != null && (
              <p className="mt-0.5 text-[10px] font-semibold text-emerald-300">
                {formatPrice(price)}
              </p>
            )}
            <span
              className="mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: bgFrom }}
            >
              {ctaText || "Découvrir"}
            </span>
          </div>

          {/* Product image */}
          {imageUrl ? (
            <div className="relative h-[120px] w-full">
              <Image
                src={getImageUrl(imageUrl)}
                alt={title}
                fill
                className="object-contain"
                sizes="100px"
              />
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <span className="text-[10px] text-white/40">Image produit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add components/admin/banner-preview.tsx
git commit -m "feat(admin): add BannerPreview component for live banner rendering"
```

---

## Task 5: Composant `GradientPicker`

**Files:**
- Create: `components/admin/gradient-picker.tsx`

**Step 1: Créer le composant**

Créer `components/admin/gradient-picker.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBannerGradient, deleteBannerGradient } from "@/actions/admin/banners";
import type { BannerGradient } from "@/lib/db/types";

interface GradientPickerProps {
  colorFrom: string;
  colorTo: string;
  savedGradients: BannerGradient[];
  onChange: (from: string, to: string) => void;
  onGradientSaved: (gradient: BannerGradient) => void;
  onGradientDeleted: (id: number) => void;
}

const BUILTIN_PRESETS = [
  { label: "Navy", from: "#183C78", to: "#1E4A8F" },
  { label: "Violet", from: "#7C3AED", to: "#EC4899" },
  { label: "Vert tropical", from: "#059669", to: "#0891B2" },
  { label: "Orange feu", from: "#EA580C", to: "#DC2626" },
  { label: "Nuit", from: "#111827", to: "#374151" },
  { label: "Menthe", from: "#00C47A", to: "#183C78" },
] as const;

export function GradientPicker({
  colorFrom,
  colorTo,
  savedGradients,
  onChange,
  onGradientSaved,
  onGradientDeleted,
}: GradientPickerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [gradientName, setGradientName] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function isActive(from: string, to: string) {
    return colorFrom.toLowerCase() === from.toLowerCase() &&
      colorTo.toLowerCase() === to.toLowerCase();
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await createBannerGradient({
        name: gradientName.trim(),
        color_from: colorFrom,
        color_to: colorTo,
      });
      if (result.success && result.gradient) {
        onGradientSaved(result.gradient);
        toast.success("Dégradé sauvegardé");
        setSaveDialogOpen(false);
        setGradientName("");
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    });
  }

  function handleDelete(id: number) {
    startDeleteTransition(async () => {
      const result = await deleteBannerGradient(id);
      if (result.success) {
        onGradientDeleted(id);
        toast.success("Dégradé supprimé");
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Built-in presets */}
      <div className="space-y-2">
        <Label>Prédégradés</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUILTIN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.from, preset.to)}
              className={cn(
                "h-8 w-full rounded-md border-2 transition-all",
                isActive(preset.from, preset.to)
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-border"
              )}
              style={{
                background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
              }}
              aria-label={preset.label}
              aria-pressed={isActive(preset.from, preset.to)}
            />
          ))}
        </div>
      </div>

      {/* Saved gradients */}
      {savedGradients.length > 0 && (
        <div className="space-y-2">
          <Label>Mes dégradés</Label>
          <div className="space-y-1">
            {savedGradients.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onChange(g.color_from, g.color_to)}
                  className={cn(
                    "h-7 flex-1 rounded border-2 text-left transition-all",
                    isActive(g.color_from, g.color_to)
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${g.color_from}, ${g.color_to})`,
                  }}
                  aria-label={g.name}
                  aria-pressed={isActive(g.color_from, g.color_to)}
                />
                <span className="w-24 truncate text-xs text-muted-foreground">
                  {g.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isDeleting}
                  onClick={() => handleDelete(g.id)}
                  aria-label={`Supprimer ${g.name}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free color pickers */}
      <div className="space-y-2">
        <Label>Couleur libre</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Début</span>
            <input
              type="color"
              name="bg_gradient_from"
              value={colorFrom}
              onChange={(e) => onChange(e.target.value, colorTo)}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Fin</span>
            <input
              type="color"
              name="bg_gradient_to"
              value={colorTo}
              onChange={(e) => onChange(colorFrom, e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setGradientName("");
            setSaveDialogOpen(true);
          }}
        >
          Sauvegarder ce dégradé
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nommer ce dégradé</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div
              className="h-12 w-full rounded-lg"
              style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
            />
            <Input
              value={gradientName}
              onChange={(e) => setGradientName(e.target.value)}
              placeholder="Ex: Violet Coucher de soleil"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isSaving || !gradientName.trim()}
              onClick={handleSave}
            >
              {isSaving ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add components/admin/gradient-picker.tsx
git commit -m "feat(admin): add GradientPicker component with presets and save/delete"
```

---

## Task 6: Refactoriser `BannerForm` + mettre à jour les pages

**Files:**
- Modify: `components/admin/banner-form.tsx`
- Modify: `app/(admin)/banners/new/page.tsx`
- Modify: `app/(admin)/banners/[id]/edit/page.tsx`

**Step 1: Réécrire `BannerForm`**

Remplacer l'intégralité de `components/admin/banner-form.tsx` par :

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BadgeColor, Banner, BannerGradient } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import {
  createBanner,
  updateBanner,
  uploadBannerImage,
  setBannerImageUrl,
} from "@/actions/admin/banners";
import dynamic from "next/dynamic";
import { AiGenerateButton } from "./ai-generate-button";
import { generateBannerText } from "@/actions/admin/ai";
import { GradientPicker } from "./gradient-picker";
import { BannerPreview } from "./banner-preview";

const AiImageDialog = dynamic(() => import("./ai-image-dialog").then((m) => m.AiImageDialog));
import type { BannerTextResult } from "@/lib/ai/schemas";

interface BannerFormProps {
  banner?: Banner | null;
  savedGradients?: BannerGradient[];
}

export function BannerForm({ banner, savedGradients: initialGradients = [] }: BannerFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!banner;
  const isActiveRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled visual state (feeds the live preview)
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(banner?.cta_text ?? "Découvrir");
  const [badgeText, setBadgeText] = useState(banner?.badge_text ?? "");
  const [badgeColor, setBadgeColor] = useState<BadgeColor>(banner?.badge_color ?? "mint");
  const [bgFrom, setBgFrom] = useState(banner?.bg_gradient_from ?? "#183C78");
  const [bgTo, setBgTo] = useState(banner?.bg_gradient_to ?? "#1E4A8F");
  const [price, setPrice] = useState<string>(banner?.price != null ? String(banner.price) : "");
  const [imagePreview, setImagePreview] = useState<string | null>(banner?.image_url ?? null);

  // Saved gradients with optimistic updates
  const [savedGradients, setSavedGradients] = useState<BannerGradient[]>(initialGradients);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateBanner(banner!.id, formData)
          : await createBanner(formData);

        if (result.success) {
          toast.success(isEdit ? "Bannière mise à jour" : "Bannière créée");
          if (!isEdit && result.id) {
            router.push(`/banners/${result.id}/edit`);
          }
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadBannerImage(banner!.id, formData);

        if (result.success) {
          toast.success("Image mise à jour");
          setImagePreview(result.url ?? null);
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Informations</CardTitle>
              <AiGenerateButton<BannerTextResult>
                label="Générer les textes"
                onGenerate={() =>
                  generateBannerText({ productName: title || undefined })
                }
                onResult={(data) => {
                  setTitle(data.title);
                  setSubtitle(data.subtitle);
                  setCtaText(data.ctaText);
                  setBadgeText(data.badgeText ?? "");
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: PlayStation 5 - Offre spéciale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Sous-titre</Label>
                <Textarea
                  id="subtitle"
                  name="subtitle"
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Description courte de la bannière"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="link_url">Lien (URL)</Label>
                  <Input
                    id="link_url"
                    name="link_url"
                    required
                    defaultValue={banner?.link_url ?? ""}
                    placeholder="Ex: /p/playstation-5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_text">Texte du bouton</Label>
                  <Input
                    id="cta_text"
                    name="cta_text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Découvrir"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apparence */}
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Texte du badge</Label>
                  <Input
                    id="badge_text"
                    name="badge_text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ex: Nouveau, Promo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Couleur du badge</Label>
                  <Select
                    name="badge_color"
                    value={badgeColor}
                    onValueChange={(v) => setBadgeColor(v as BadgeColor)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mint">Vert menthe</SelectItem>
                      <SelectItem value="red">Rouge</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="blue">Bleu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <GradientPicker
                colorFrom={bgFrom}
                colorTo={bgTo}
                savedGradients={savedGradients}
                onChange={(from, to) => {
                  setBgFrom(from);
                  setBgTo(to);
                }}
                onGradientSaved={(g) => setSavedGradients((prev) => [...prev, g])}
                onGradientDeleted={(id) =>
                  setSavedGradients((prev) => prev.filter((g) => g.id !== id))
                }
              />

              <div className="space-y-2">
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEdit ? (
                <>
                  {imagePreview && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border">
                      <Image
                        src={getImageUrl(imagePreview)}
                        alt={banner?.title ?? "Banner"}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? "Changer l'image" : "Ajouter une image"}
                    </Button>
                    <AiImageDialog
                      onImageGenerated={(url) => {
                        startTransition(async () => {
                          const result = await setBannerImageUrl(banner!.id, url);
                          if (result.success) {
                            setImagePreview(url);
                            toast.success("Image IA enregistrée");
                          } else {
                            toast.error(result.error || "Erreur lors de l'enregistrement de l'image");
                          }
                        });
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enregistrez d&apos;abord la bannière pour ajouter une image.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Programmation */}
          <Card>
            <CardHeader>
              <CardTitle>Programmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Date de début</Label>
                  <input
                    type="datetime-local"
                    id="starts_at"
                    name="starts_at"
                    defaultValue={banner?.starts_at?.replace(" ", "T").slice(0, 16) ?? ""}
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">Date de fin</Label>
                  <input
                    type="datetime-local"
                    id="ends_at"
                    name="ends_at"
                    defaultValue={banner?.ends_at?.replace(" ", "T").slice(0, 16) ?? ""}
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <input
                  type="hidden"
                  name="is_active"
                  ref={isActiveRef}
                  defaultValue={banner?.is_active ?? 1}
                />
                <Switch
                  defaultChecked={banner ? banner.is_active === 1 : true}
                  onCheckedChange={(checked) => {
                    if (isActiveRef.current)
                      isActiveRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordre d&apos;affichage</Label>
                <Input
                  id="display_order"
                  name="display_order"
                  type="number"
                  min={0}
                  defaultValue={banner?.display_order ?? 0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Live preview — sticky */}
          <div className="lg:sticky lg:top-6">
            <BannerPreview
              title={title}
              subtitle={subtitle}
              badgeText={badgeText}
              badgeColor={badgeColor}
              price={price !== "" ? Number(price) : null}
              imageUrl={imagePreview}
              bgFrom={bgFrom}
              bgTo={bgTo}
              ctaText={ctaText}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer la bannière"}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

**Step 2: Mettre à jour `app/(admin)/banners/new/page.tsx`**

```tsx
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";
import { getSavedGradients } from "@/lib/db/admin/banners";

export default async function NewBannerPage() {
  const savedGradients = await getSavedGradients();

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux bannières"
          >
            <Link href="/banners">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-2xl">
              Nouvelle bannière
            </h1>
            <p className="text-sm text-muted-foreground">
              Créer une bannière
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <BannerForm savedGradients={savedGradients} />
    </div>
  );
}
```

**Step 3: Mettre à jour `app/(admin)/banners/[id]/edit/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";
import { getBannerById, getSavedGradients } from "@/lib/db/admin/banners";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBannerPage({ params }: Props) {
  const { id } = await params;
  const [banner, savedGradients] = await Promise.all([
    getBannerById(Number(id)),
    getSavedGradients(),
  ]);

  if (!banner) notFound();

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux bannières"
          >
            <Link href="/banners">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {banner.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Modifier la bannière
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <BannerForm banner={banner} savedGradients={savedGradients} />
    </div>
  );
}
```

**Step 4: Lancer tous les tests**

```bash
npm run test
```

Expected: tous les tests passent.

**Step 5: Vérifier la compilation TypeScript et le lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors (1 warning existant sur `ProductBlueprint` est hors scope).

**Step 6: Commit final**

```bash
git add components/admin/banner-form.tsx "app/(admin)/banners/new/page.tsx" "app/(admin)/banners/[id]/edit/page.tsx"
git commit -m "feat(admin): refactor BannerForm with live preview, gradient picker and saved presets"
```

---

## Task 7: Vérification finale

**Step 1: Lancer le serveur de dev et tester manuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3000/banners/new

Vérifier :
- [ ] La prévisualisation se met à jour en tapant le titre
- [ ] Cliquer un preset met à jour preview + color pickers
- [ ] Modifier les color pickers met à jour la preview
- [ ] "Sauvegarder ce dégradé" ouvre le dialog, nommer et sauvegarder fonctionne
- [ ] Le gradient sauvegardé apparaît dans "Mes dégradés"
- [ ] Le bouton × supprime le gradient sauvegardé
- [ ] Le formulaire de création/édition soumet correctement la bannière
- [ ] L'IA "Générer les textes" met à jour les champs contrôlés

**Step 2: Créer la PR**

```bash
git push -u origin feat/banner-gradient-preview
gh pr create --title "feat(admin): banner live preview, gradient presets and saved gradients" \
  --body "$(cat <<'EOF'
## Summary
- Prévisualisation temps réel dans la sidebar sticky du formulaire bannière
- 6 prédégradés codés en dur sélectionnables en un clic
- Sauvegarde/suppression de dégradés personnalisés (table D1 `banner_gradients`)
- `BannerForm` converti en composant contrôlé
- Nouveaux composants : `BannerPreview`, `GradientPicker`
- 2 nouvelles Server Actions : `createBannerGradient`, `deleteBannerGradient`

## Test plan
- [ ] Tests unitaires passent (`npm run test`)
- [ ] TypeScript compile sans erreur (`npx tsc --noEmit`)
- [ ] Lint propre (`npm run lint`)
- [ ] Prévisualisation mise à jour en temps réel sur /banners/new et /banners/[id]/edit
- [ ] Sauvegarde et suppression de dégradés fonctionnent

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
