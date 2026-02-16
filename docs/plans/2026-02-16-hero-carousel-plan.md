# Hero Carousel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static single-product hero banner with an immersive Embla-powered carousel backed by a banner management system with scheduling.

**Architecture:** Banners stored in D1 via Drizzle ORM, managed through admin CRUD pages. Storefront hero uses Embla Carousel (3kb) with glassmorphism design. Server Component fetches active banners, passes to Client Component carousel. Fallback to featured products when no banners are active.

**Tech Stack:** Next.js 16.1 (App Router), Drizzle ORM (D1), Embla Carousel, Tailwind CSS 4, shadcn/ui, HugeIcons, Sonner toasts, R2 image storage.

**Design doc:** `docs/plans/2026-02-16-hero-carousel-design.md`

---

## Task 1: Install Embla Carousel dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
npm install embla-carousel-react embla-carousel-autoplay
```

**Step 2: Verify installation**

Run:
```bash
node -e "require('embla-carousel-react'); require('embla-carousel-autoplay'); console.log('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add embla-carousel-react and embla-carousel-autoplay"
```

---

## Task 2: Add `banners` table to Drizzle schema

**Files:**
- Modify: `lib/db/schema.ts` — add `banners` table definition
- Modify: `lib/db/types.ts` — add `Banner` interface

**Step 1: Add the Drizzle table definition**

Add to `lib/db/schema.ts` after the last table, following existing conventions (integers for booleans, text for dates, `sql\`(datetime('now'))\`` for defaults):

```typescript
// ================================================================ //
// Banners
// ================================================================ //

export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  badge_text: text("badge_text"),
  badge_color: text("badge_color").notNull().default("mint"),
  image_url: text("image_url"),
  link_url: text("link_url").notNull(),
  cta_text: text("cta_text").notNull().default("Découvrir"),
  price: integer("price"),
  bg_gradient_from: text("bg_gradient_from").notNull().default("#183C78"),
  bg_gradient_to: text("bg_gradient_to").notNull().default("#1E4A8F"),
  display_order: integer("display_order").notNull().default(0),
  is_active: integer("is_active").notNull().default(1),
  starts_at: text("starts_at"),
  ends_at: text("ends_at"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_banners_active_order").on(table.is_active, table.display_order),
]);
```

**Step 2: Add the `Banner` TypeScript interface**

Add to `lib/db/types.ts`:

```typescript
export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  badge_color: string;
  image_url: string | null;
  link_url: string;
  cta_text: string;
  price: number | null;
  bg_gradient_from: string;
  bg_gradient_to: string;
  display_order: number;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 3: Generate the SQL migration**

Run:
```bash
npm run db:generate
```
Expected: A new migration file in the drizzle output directory.

**Step 4: Apply migration to local D1**

Run:
```bash
npx wrangler d1 execute netereka-db --local --file=<generated-migration-file.sql>
```

**Step 5: Verify the table exists**

Run:
```bash
npx wrangler d1 execute netereka-db --local --command "PRAGMA table_info(banners)"
```
Expected: Column list matching the schema.

**Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/types.ts drizzle/
git commit -m "feat: add banners table schema and TypeScript type"
```

---

## Task 3: Create banner query helpers

**Files:**
- Create: `lib/db/admin/banners.ts` — admin queries (all banners, by ID)
- Create: `lib/db/storefront/banners.ts` — storefront query (active banners only)

**Step 1: Create admin banner queries**

Create `lib/db/admin/banners.ts`:

```typescript
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Banner } from "@/lib/db/types";

export async function getAllBanners(): Promise<Banner[]> {
  const db = await getDrizzle();
  return db.select().from(banners).orderBy(asc(banners.display_order)) as unknown as Banner[];
}

export async function getBannerById(id: number): Promise<Banner | undefined> {
  const db = await getDrizzle();
  const rows = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  return rows[0] as unknown as Banner | undefined;
}
```

**Step 2: Create storefront active banners query**

Create `lib/db/storefront/banners.ts`:

```typescript
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq, and, or, isNull, lte, gt, asc, sql } from "drizzle-orm";
import type { Banner } from "@/lib/db/types";

export async function getActiveBanners(): Promise<Banner[]> {
  const db = await getDrizzle();
  const now = new Date().toISOString();

  return db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.is_active, 1),
        or(isNull(banners.starts_at), lte(banners.starts_at, now)),
        or(isNull(banners.ends_at), gt(banners.ends_at, now))
      )
    )
    .orderBy(asc(banners.display_order)) as unknown as Banner[];
}
```

Check if the directories exist first. Look at existing files in `lib/db/` to see the folder structure — there may already be `admin/` and `storefront/` subdirectories or the queries may live elsewhere. Adapt paths accordingly.

**Step 3: Commit**

```bash
git add lib/db/admin/banners.ts lib/db/storefront/banners.ts
git commit -m "feat: add banner query helpers for admin and storefront"
```

---

## Task 4: Create admin server actions for banners

**Files:**
- Create: `actions/admin/banners.ts`

**Step 1: Write banner server actions**

Create `actions/admin/banners.ts` following the existing pattern from `actions/admin/products.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/images";
import { nanoid } from "nanoid";
import type { ActionResult } from "@/lib/types/actions";

const bannerSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  subtitle: z.string().max(500).optional().default(""),
  badge_text: z.string().max(50).optional().default(""),
  badge_color: z.enum(["mint", "red", "orange", "blue"]).default("mint"),
  link_url: z.string().min(1, "Le lien est requis"),
  cta_text: z.string().max(50).optional().default("Découvrir"),
  price: z.coerce.number().int().min(0).optional(),
  bg_gradient_from: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#183C78"),
  bg_gradient_to: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#1E4A8F"),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.number().min(0).max(1).default(1),
  starts_at: z.string().optional().default(""),
  ends_at: z.string().optional().default(""),
});

function revalidateBannerPaths() {
  revalidatePath("/banners");
  revalidatePath("/");
}

export async function createBanner(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const db = await getDrizzle();

  const result = await db.insert(banners).values({
    title: data.title,
    subtitle: data.subtitle || null,
    badge_text: data.badge_text || null,
    badge_color: data.badge_color,
    link_url: data.link_url,
    cta_text: data.cta_text || "Découvrir",
    price: data.price ?? null,
    bg_gradient_from: data.bg_gradient_from,
    bg_gradient_to: data.bg_gradient_to,
    display_order: data.display_order,
    is_active: data.is_active,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
  }).returning({ id: banners.id });

  revalidateBannerPaths();
  return { success: true, id: result[0]?.id };
}

export async function updateBanner(id: number, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const db = await getDrizzle();

  await db.update(banners).set({
    title: data.title,
    subtitle: data.subtitle || null,
    badge_text: data.badge_text || null,
    badge_color: data.badge_color,
    link_url: data.link_url,
    cta_text: data.cta_text || "Découvrir",
    price: data.price ?? null,
    bg_gradient_from: data.bg_gradient_from,
    bg_gradient_to: data.bg_gradient_to,
    display_order: data.display_order,
    is_active: data.is_active,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    updated_at: new Date().toISOString(),
  }).where(eq(banners.id, id));

  revalidateBannerPaths();
  return { success: true };
}

export async function uploadBannerImage(bannerId: number, formData: FormData): Promise<ActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return { success: false, error: "Image invalide" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "L'image doit faire moins de 5 Mo" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const key = `banners/${bannerId}/${nanoid()}.${ext}`;
  await uploadToR2(file, key);

  const db = await getDrizzle();
  // Delete old image if exists
  const existing = await db.select({ image_url: banners.image_url }).from(banners).where(eq(banners.id, bannerId)).limit(1);
  if (existing[0]?.image_url) {
    try { await deleteFromR2(existing[0].image_url.replace(/^\/images\//, "")); } catch {}
  }

  const url = `/images/${key}`;
  await db.update(banners).set({ image_url: url, updated_at: new Date().toISOString() }).where(eq(banners.id, bannerId));

  revalidateBannerPaths();
  return { success: true, url };
}

export async function toggleBannerActive(id: number): Promise<ActionResult> {
  await requireAdmin();

  const db = await getDrizzle();
  const existing = await db.select({ is_active: banners.is_active }).from(banners).where(eq(banners.id, id)).limit(1);
  if (!existing[0]) return { success: false, error: "Bannière introuvable" };

  await db.update(banners).set({
    is_active: existing[0].is_active === 1 ? 0 : 1,
    updated_at: new Date().toISOString(),
  }).where(eq(banners.id, id));

  revalidateBannerPaths();
  return { success: true };
}

export async function deleteBanner(id: number): Promise<ActionResult> {
  await requireAdmin();

  const db = await getDrizzle();
  const existing = await db.select({ image_url: banners.image_url }).from(banners).where(eq(banners.id, id)).limit(1);

  // Delete R2 image (best-effort)
  if (existing[0]?.image_url) {
    try { await deleteFromR2(existing[0].image_url.replace(/^\/images\//, "")); } catch {}
  }

  await db.delete(banners).where(eq(banners.id, id));

  revalidateBannerPaths();
  return { success: true };
}
```

Adjust imports based on actual `ActionResult` location (check `lib/types/actions.ts` or `lib/utils`). Check `uploadToR2` signature matches — it may take `(file: File, key: string)` or `(buffer, key, contentType)`.

**Step 2: Commit**

```bash
git add actions/admin/banners.ts
git commit -m "feat: add banner admin server actions (CRUD, image upload, toggle)"
```

---

## Task 5: Add banner entry to admin sidebar

**Files:**
- Modify: `components/admin/sidebar.tsx`

**Step 1: Add sidebar nav item**

Add `Image02Icon` (or `SlidersHorizontalIcon` or `PresentationBarChart01Icon`) import from `@hugeicons/core-free-icons`. Check available icons — search for a "banner", "image", "slideshow", or "presentation" icon. Add to `navItems` array after "Catégories":

```typescript
{ href: "/banners", label: "Bannières", icon: Image02Icon },
```

**Step 2: Verify visually**

Run `npm run dev`, navigate to any admin page, confirm "Bannières" appears in the sidebar.

**Step 3: Commit**

```bash
git add components/admin/sidebar.tsx
git commit -m "feat: add Bannières entry to admin sidebar"
```

---

## Task 6: Create admin banner list page

**Files:**
- Create: `app/(admin)/banners/page.tsx` — server component, fetches all banners
- Create: `app/(admin)/banners/loading.tsx` — skeleton loader
- Create: `components/admin/banner-table.tsx` — client component, banner list with actions

**Step 1: Create the banner table component**

Create `components/admin/banner-table.tsx`. Follow the pattern from `components/admin/product-table.tsx`:

- `"use client"` directive
- `memo`ized `BannerRow` sub-component
- Columns: thumbnail (small image preview), title, status badge (Active vert / Programmée jaune / Expirée rouge / Inactive gris), display order, dates, actions dropdown (Edit, Toggle active, Delete with AlertDialog confirmation)
- Status logic:
  - `is_active === 0` → "Inactive" (gray badge)
  - `starts_at && starts_at > now` → "Programmée" (yellow badge)
  - `ends_at && ends_at <= now` → "Expirée" (red badge)
  - otherwise → "Active" (green badge)
- Actions call `toggleBannerActive` and `deleteBanner` from `@/actions/admin/banners`
- Empty state: "Aucune bannière créée"

**Step 2: Create the list page**

Create `app/(admin)/banners/page.tsx`:

```typescript
import { getAllBanners } from "@/lib/db/admin/banners";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminHeader } from "@/components/admin/admin-header";
import { BannerTable } from "@/components/admin/banner-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function BannersPage() {
  const bannerList = await getAllBanners();

  return (
    <div>
      <AdminPageHeader className="space-y-4">
        <AdminHeader title="Bannières" />
        <div className="flex items-center justify-end">
          <Button asChild>
            <Link href="/banners/new">Nouvelle bannière</Link>
          </Button>
        </div>
      </AdminPageHeader>
      <div className="p-4 sm:p-6">
        <BannerTable banners={bannerList} />
      </div>
    </div>
  );
}
```

**Step 3: Create loading skeleton**

Create `app/(admin)/banners/loading.tsx` with a simple skeleton matching the table layout.

**Step 4: Verify**

Run dev server, navigate to `/banners` in admin. Should see empty state or table if seeded.

**Step 5: Commit**

```bash
git add app/(admin)/banners/ components/admin/banner-table.tsx
git commit -m "feat: add admin banner list page with table and actions"
```

---

## Task 7: Create admin banner form (new + edit pages)

**Files:**
- Create: `components/admin/banner-form.tsx` — client component, form for create/edit
- Create: `app/(admin)/banners/new/page.tsx` — new banner page
- Create: `app/(admin)/banners/[id]/edit/page.tsx` — edit banner page

**Step 1: Create the banner form component**

Create `components/admin/banner-form.tsx`. Follow `components/admin/product-form.tsx` pattern:

- `"use client"` directive
- Props: `{ banner?: Banner | null }`
- `useTransition` + `form action={handleSubmit}`
- Layout: `grid lg:grid-cols-3` — main content (2 cols) + sidebar (1 col)
- Main content cards:
  - **Informations** card: title (Input), subtitle (Textarea), link_url (Input), cta_text (Input)
  - **Apparence** card: badge_text (Input), badge_color (Select: mint/red/orange/blue), bg_gradient_from + bg_gradient_to (color inputs using `react-colorful` HexColorPicker or native `<input type="color">`), price (Input number, optional)
  - **Image** card: image upload zone (click to upload, preview if image exists), calls `uploadBannerImage` action
  - **Programmation** card: starts_at (datetime-local input), ends_at (datetime-local input)
- Sidebar card:
  - is_active Switch (hidden input + Switch pattern)
  - display_order (Input number)
  - Submit button: "Créer" / "Mettre à jour"
- On success: toast + redirect (for new) or toast (for edit)

**Step 2: Create the new banner page**

Create `app/(admin)/banners/new/page.tsx`:

```typescript
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export default function NewBannerPage() {
  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 shrink-0">
            <Link href="/banners">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-2xl">Nouvelle bannière</h1>
            <p className="text-sm text-muted-foreground">Créer une bannière pour le carousel</p>
          </div>
        </header>
      </AdminPageHeader>
      <div className="p-4 sm:p-6">
        <BannerForm />
      </div>
    </div>
  );
}
```

**Step 3: Create the edit banner page**

Create `app/(admin)/banners/[id]/edit/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { getBannerById } from "@/lib/db/admin/banners";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banner = await getBannerById(Number(id));
  if (!banner) notFound();

  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 shrink-0">
            <Link href="/banners">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-2xl">{banner.title}</h1>
            <p className="text-sm text-muted-foreground">Modifier la bannière</p>
          </div>
        </header>
      </AdminPageHeader>
      <div className="p-4 sm:p-6">
        <BannerForm banner={banner} />
      </div>
    </div>
  );
}
```

Note: In Next.js 16, `params` is a Promise — must `await` it.

**Step 4: Verify full flow**

Run dev server. Test: create a banner → see it in the list → edit it → toggle active → delete it. Upload an image and verify it appears.

**Step 5: Commit**

```bash
git add components/admin/banner-form.tsx app/(admin)/banners/
git commit -m "feat: add admin banner form with create and edit pages"
```

---

## Task 8: Build the hero carousel storefront component

**Files:**
- Replace: `components/storefront/hero-banner.tsx` — rewrite as Embla carousel with glassmorphism

**Step 1: Rewrite the hero banner component**

Replace `components/storefront/hero-banner.tsx` entirely. The new component:

- `"use client"` directive (needed for Embla hooks)
- Named export `HeroBanner` (same as before — no import changes needed in `page.tsx`)
- Props: `{ banners: Banner[]; fallbackProducts: Product[] }`
- Converts fallback products into banner-like objects if `banners` is empty
- Uses `useEmblaCarousel` with `{ loop: true, duration: 30 }` + `Autoplay({ delay: 5000, stopOnInteraction: true })`
- Each slide renders:
  - Background: inline `style={{ background: \`linear-gradient(135deg, ${from}, ${to})\` }}` using the banner's gradient colors
  - Decorative orbs (absolute positioned, mint + white, blur-3xl)
  - Glass card (left): badge pill, title `<h2>`, subtitle `<p>`, optional price, CTA link with ChevronRight icon
  - Product image (right): `<Image>` with `priority`/`fetchPriority="high"` only for first slide, `loading="lazy"` for others
- Dot indicators at bottom center with active pill elongation
- Pause/play button (small, bottom-right)
- `prefers-reduced-motion` media query check to disable autoplay
- Full ARIA attributes per design doc

**Key styling classes:**
- Container: `relative overflow-hidden rounded-2xl h-[280px] sm:h-[400px] lg:h-[480px]`
- Glass card: `bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl`
- Badge: `inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide` + color variant
- CTA: `inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90` with text color from gradient
- Dots: `flex items-center justify-center gap-2` — inactive: `w-2 h-2 rounded-full bg-white/40`, active: `w-6 h-2 rounded-full bg-white transition-all duration-300`

**Step 2: Verify carousel renders**

Run dev server, check homepage. If no banners in DB yet, should fallback to featured products in carousel format.

**Step 3: Commit**

```bash
git add components/storefront/hero-banner.tsx
git commit -m "feat: replace static hero with Embla glassmorphism carousel"
```

---

## Task 9: Update homepage to pass banners to hero

**Files:**
- Modify: `app/(storefront)/page.tsx`

**Step 1: Add banner data fetching**

In the homepage `page.tsx`, add `getActiveBanners()` to the existing `Promise.all`:

```typescript
import { getActiveBanners } from "@/lib/db/storefront/banners";

// In the component:
const [activeBanners, categories, featured, latest] = await Promise.all([
  getActiveBanners(),
  getCategories(),
  getFeaturedProducts(10),
  getLatestProducts(10, true),
]);
```

**Step 2: Update HeroBanner usage**

Replace:
```typescript
{heroProduct && <HeroBanner product={heroProduct} />}
```
With:
```typescript
<HeroBanner banners={activeBanners} fallbackProducts={featured.slice(0, 3)} />
```

Remove `const heroProduct = featured[0];` if it exists.

**Step 3: Verify end-to-end**

Run dev server. Homepage should show:
- If banners in DB → carousel with those banners
- If no banners → carousel with first 3 featured products in glassmorphism style

**Step 4: Commit**

```bash
git add app/(storefront)/page.tsx
git commit -m "feat: wire homepage to fetch and display active banners in hero carousel"
```

---

## Task 10: Seed sample banners and final verification

**Files:**
- Create or modify: `db/seeds/` — add a banner seed script (optional but recommended for testing)

**Step 1: Seed 2-3 test banners**

Create a quick seed via wrangler CLI or a seed script that inserts test banners:

```sql
INSERT INTO banners (title, subtitle, badge_text, badge_color, link_url, cta_text, bg_gradient_from, bg_gradient_to, display_order, is_active)
VALUES
  ('PlayStation 5 Slim', 'La nouvelle génération du gaming', 'Nouveau', 'mint', '/p/ps5-slim', 'Découvrir', '#183C78', '#1E4A8F', 0, 1),
  ('iPhone 16 Pro Max', 'La puissance du titane', 'Exclusif', 'blue', '/p/iphone-16-pro-max', 'Voir le produit', '#1a1a2e', '#16213e', 1, 1),
  ('Soldes Rentrée', 'Jusqu''à -30% sur les laptops', 'Promo -30%', 'red', '/c/ordinateurs', 'En profiter', '#2d1b69', '#11998e', 2, 1);
```

**Step 2: Full visual verification**

Run dev server, verify:
- [ ] Homepage carousel shows seeded banners
- [ ] Auto-play advances every 5 seconds
- [ ] Swipe works on mobile (use Chrome DevTools mobile emulation)
- [ ] Dots navigate between slides
- [ ] Pause on hover works
- [ ] Glassmorphism card is readable over all gradient backgrounds
- [ ] CTA buttons link to correct URLs
- [ ] Admin `/banners` shows the list
- [ ] Admin can create, edit, toggle, delete banners
- [ ] Image upload works
- [ ] Scheduling works (set starts_at in the future → banner not visible on storefront)
- [ ] Fallback works (disable all banners → featured products show)

**Step 3: Commit**

```bash
git add db/seeds/
git commit -m "feat: add sample banner seeds for testing"
```

---

## Task 11: Final cleanup and commit

**Step 1: Run lint**

```bash
npm run lint
```

Fix any lint errors.

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and type errors from hero carousel implementation"
```

---

## Task Dependencies

```
Task 1 (Install Embla) ─────────────────────────────────────┐
Task 2 (Schema + Types) ──┬── Task 3 (Query helpers) ──┐    │
                           │                             ├── Task 8 (Hero component) ── Task 9 (Homepage wiring) ── Task 10 (Seed + verify)
                           └── Task 4 (Server actions) ──┤
                                                         ├── Task 6 (List page)
Task 5 (Sidebar) ───────────────────────────────────────┤
                                                         └── Task 7 (Form pages)

Task 11 (Cleanup) depends on all above
```

Parallelizable groups:
- **Group A** (no deps): Task 1 + Task 2 (can run simultaneously)
- **Group B** (after Task 2): Task 3 + Task 4 + Task 5 (can run simultaneously)
- **Group C** (after Group B): Task 6 + Task 7 + Task 8 (Task 8 also needs Task 1)
- **Group D** (after Group C): Task 9
- **Group E** (after Task 9): Task 10
- **Group F** (after all): Task 11
