# Assisted Product Creation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the product creation form with a guided 4-step wizard (Identité → Prix & Stock → Médias → Finalisation) that includes placeholders, helper text, and tooltips to reduce friction.

**Architecture:** A new `ProductWizard` client component replaces `ProductFormSections` for draft products (`is_draft = 1`). A new `saveDraftStep` server action handles partial saves between steps without publishing the product. The existing `updateProduct` action is reused for the final publish.

**Tech Stack:** Next.js App Router, TypeScript, React `useTransition`, Zod, Drizzle/raw D1, Sonner toasts, shadcn/ui (Switch, Input, Label, Card, Textarea), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `actions/admin/products.ts` | Modify | Add `saveDraftStep` + `applyDraftUpdate` helper |
| `__tests__/unit/actions/admin-products-draft.test.ts` | Create | Unit tests for `saveDraftStep` |
| `components/admin/product-wizard.tsx` | Create | Main wizard orchestrator (step state, save, navigate) |
| `components/admin/product-wizard/wizard-stepper.tsx` | Create | Stepper bar (step indicators + connector lines) |
| `components/admin/product-wizard/step-identity.tsx` | Create | Step 1: name, brand, SKU, category |
| `components/admin/product-wizard/step-pricing.tsx` | Create | Step 2: prices, stock, weight |
| `components/admin/product-wizard/step-media.tsx` | Create | Step 3: images + variants (existing components) |
| `components/admin/product-wizard/step-finalization.tsx` | Create | Step 4: description, SEO, visibility toggles |
| `app/(admin)/products/[id]/edit/page.tsx` | Modify | Conditional render wizard vs form sections |

---

## Chunk 1: `saveDraftStep` server action

### Task 1: Add stub + write failing tests

**Files:**
- Modify: `actions/admin/products.ts`
- Create: `__tests__/unit/actions/admin-products-draft.test.ts`

- [ ] **Step 1.1: Add stub export to `actions/admin/products.ts`**

Append at the end of the file (before the closing):

```typescript
export async function saveDraftStep(
  _id: string,
  _formData: FormData,
): Promise<ActionResult> {
  return { success: false, error: "not implemented" };
}
```

- [ ] **Step 1.2: Create the test file**

```typescript
// __tests__/unit/actions/admin-products-draft.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & {
      digest: string;
    };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  queryFirst: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi
    .fn()
    .mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
}));

import { saveDraftStep } from "@/actions/admin/products";

const DRAFT_PRODUCT = { slug: "draft-abc123" };

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("saveDraftStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst.mockResolvedValue(DRAFT_PRODUCT);
    mocks.execute.mockResolvedValue(undefined);
  });

  // ── Auth & ID guards ──────────────────────────────────────────────────────

  it("rejette un id vide", async () => {
    const result = await saveDraftStep("", makeFormData({ _step: "1" }));
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("retourne une erreur si le produit est introuvable ou non-brouillon", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "Test", category_id: "cat-1" }),
    );
    expect(result).toEqual({ success: false, error: "Produit introuvable" });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  // ── Étape invalide ────────────────────────────────────────────────────────

  it("retourne une erreur pour une étape invalide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "99" }),
    );
    expect(result).toEqual({ success: false, error: "Étape invalide" });
  });

  // ── Étape 1 : Identité ────────────────────────────────────────────────────

  it("étape 1 : réussit avec nom et catégorie valides", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
        brand: "Samsung",
        sku: "SGX-A55",
      }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).toContain("UPDATE products SET");
    expect(sql).toContain("WHERE id = ? AND is_draft = 1");
    expect(sql).not.toContain("is_draft = 0");
  });

  it("étape 1 : rejette si nom vide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "", category_id: "cat-1" }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("nom");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : rejette si category_id vide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "1", name: "Test", category_id: "" }),
    );
    expect(result.success).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : auto-dérive le slug depuis name si slug actuel commence par draft-", async () => {
    // Second queryFirst call checks for slug collision
    mocks.queryFirst
      .mockResolvedValueOnce(DRAFT_PRODUCT) // product lookup
      .mockResolvedValueOnce(null); // slug collision check (no collision)
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
      }),
    );
    expect(result).toEqual({ success: true });
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).toContain("slug = ?");
  });

  it("étape 1 : retourne erreur si slug collide avec un autre produit", async () => {
    mocks.queryFirst
      .mockResolvedValueOnce(DRAFT_PRODUCT)
      .mockResolvedValueOnce({ id: "other-product" }); // collision
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55",
        category_id: "cat-1",
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("slug");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 1 : ne dérive pas le slug si le slug actuel n'est pas un draft-slug", async () => {
    mocks.queryFirst.mockResolvedValueOnce({ slug: "samsung-galaxy-a55" }); // already set
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "1",
        name: "Samsung Galaxy A55 modifié",
        category_id: "cat-1",
      }),
    );
    expect(result).toEqual({ success: true });
    // Only one queryFirst call (product lookup), no collision check
    expect(mocks.queryFirst).toHaveBeenCalledOnce();
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).not.toContain("slug = ?");
  });

  // ── Étape 2 : Prix & Stock ────────────────────────────────────────────────

  it("étape 2 : réussit avec un prix valide", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "125000" }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("étape 2 : rejette un prix négatif", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "-1" }),
    );
    expect(result.success).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 2 : rejette un prix non-entier", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "2", base_price: "125.50" }),
    );
    expect(result.success).toBe(false);
  });

  // ── Étape 3 : Médias (no-op) ──────────────────────────────────────────────

  it("étape 3 : réussit sans appel DB (aucun champ à sauvegarder)", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "3" }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  // ── Étape 4 : Finalisation ────────────────────────────────────────────────

  it("étape 4 : réussit avec des champs valides", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({
        _step: "4",
        short_description: "Un super téléphone",
        meta_title: "Samsung Galaxy A55 | Netereka",
        meta_description: "Achetez le Samsung Galaxy A55",
        is_active: "0",
        is_featured: "0",
      }),
    );
    expect(result).toEqual({ success: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("étape 4 : rejette meta_title > 60 caractères", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", meta_title: "a".repeat(61) }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("60");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 4 : rejette meta_description > 160 caractères", async () => {
    const result = await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", meta_description: "a".repeat(161) }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("160");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("étape 4 : ne touche pas is_draft dans le SQL", async () => {
    await saveDraftStep(
      "prod-1",
      makeFormData({ _step: "4", is_active: "1", is_featured: "0" }),
    );
    const sql: string = mocks.execute.mock.calls[0][0];
    expect(sql).not.toContain("is_draft");
  });
});
```

- [ ] **Step 1.3: Run tests to confirm they fail**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-products-draft.test.ts
```

Expected: multiple failures ("not implemented", various assertion errors).

---

### Task 2: Implement `saveDraftStep`

**Files:**
- Modify: `actions/admin/products.ts`

- [ ] **Step 2.1: Replace the stub with the full implementation**

Remove the stub added in Step 1.1 and replace with:

```typescript
export async function saveDraftStep(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const product = await queryFirst<{ slug: string }>(
    "SELECT slug FROM products WHERE id = ? AND is_draft = 1",
    [id],
  );
  if (!product) return { success: false, error: "Produit introuvable" };

  const step = (formData.get("_step") as string) ?? "";
  const raw = Object.fromEntries(formData);
  delete raw._step;

  if (step === "1") {
    const parsed = z
      .object({
        name: z.string().min(1, "Le nom est requis"),
        category_id: z.string().min(1, "La catégorie est requise"),
        brand: z.string().optional().default(""),
        sku: z.string().optional().default(""),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  if (step === "2") {
    const parsed = z
      .object({
        base_price: z.coerce
          .number()
          .int("Le prix doit être un entier")
          .min(0, "Le prix doit être positif"),
        compare_price: z.coerce.number().int().min(0).optional(),
        stock_quantity: z.coerce.number().int().min(0).default(0),
        low_stock_threshold: z.coerce.number().int().min(0).default(5),
        weight_grams: z.coerce.number().int().min(0).optional(),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  if (step === "3") {
    return { success: true };
  }

  if (step === "4") {
    const parsed = z
      .object({
        short_description: z.string().optional().default(""),
        description: z.string().optional().default(""),
        meta_title: z
          .string()
          .max(60, "Le titre SEO ne peut pas dépasser 60 caractères")
          .optional()
          .default(""),
        meta_description: z
          .string()
          .max(160, "La méta-description ne peut pas dépasser 160 caractères")
          .optional()
          .default(""),
        is_active: z.coerce.number().int().min(0).max(1).default(0),
        is_featured: z.coerce.number().int().min(0).max(1).default(0),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  return { success: false, error: "Étape invalide" };
}

async function applyDraftUpdate(
  id: string,
  data: Record<string, unknown>,
  currentSlug: string,
): Promise<ActionResult> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  // Slug auto-derivation: only when name is set and current slug is a draft placeholder
  if ("name" in data && data.name && currentSlug.startsWith("draft-")) {
    const candidateSlug = slugify(data.name as string);
    const collision = await queryFirst<{ id: string }>(
      "SELECT id FROM products WHERE slug = ? AND id != ?",
      [candidateSlug, id],
    );
    if (collision) {
      return {
        success: false,
        error: `Un produit avec le slug "${candidateSlug}" existe déjà`,
      };
    }
    sets.push("slug = ?");
    values.push(candidateSlug);
  }

  // Fields that should be stored as NULL when empty string
  const NULLABLE_FIELDS = new Set([
    "brand",
    "sku",
    "compare_price",
    "weight_grams",
    "short_description",
    "description",
    "meta_title",
    "meta_description",
  ]);

  // Only these columns are allowed in the partial update
  const ALLOWED_COLUMNS = new Set([
    "name",
    "brand",
    "sku",
    "category_id",
    "base_price",
    "compare_price",
    "stock_quantity",
    "low_stock_threshold",
    "weight_grams",
    "short_description",
    "description",
    "meta_title",
    "meta_description",
    "is_active",
    "is_featured",
  ]);

  for (const [key, val] of Object.entries(data)) {
    if (!ALLOWED_COLUMNS.has(key)) continue;
    sets.push(`${key} = ?`);
    values.push(
      NULLABLE_FIELDS.has(key) && (val === "" || val == null) ? null : val,
    );
  }

  values.push(id);

  await execute(
    `UPDATE products SET ${sets.join(", ")} WHERE id = ? AND is_draft = 1`,
    values,
  );

  return { success: true };
}
```

- [ ] **Step 2.2: Run tests to confirm they all pass**

```bash
npm run test -- --reporter=verbose __tests__/unit/actions/admin-products-draft.test.ts
```

Expected: all tests pass.

- [ ] **Step 2.3: Run full test suite to verify no regressions**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2.4: Commit**

```bash
git checkout -b feat/assisted-product-wizard
git add actions/admin/products.ts "__tests__/unit/actions/admin-products-draft.test.ts"
git commit -m "feat(admin): add saveDraftStep action for partial product saves"
```

---

## Chunk 2: Wizard UI components

### Task 3: Create `wizard-stepper.tsx`

**Files:**
- Create: `components/admin/product-wizard/wizard-stepper.tsx`

- [ ] **Step 3.1: Create the file**

```typescript
// components/admin/product-wizard/wizard-stepper.tsx
interface WizardStep {
  label: string;
  subtitle: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number; // 0-indexed
  onStepClick: (index: number) => void;
}

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
}: WizardStepperProps) {
  return (
    <div className="flex items-center border-b bg-muted/30 px-6 py-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} className="flex min-w-0 flex-1 items-center">
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(index)}
              disabled={!isCompleted}
              className="flex shrink-0 items-center gap-2.5 disabled:cursor-default"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  isCompleted
                    ? "bg-[#183C78] text-white"
                    : isCurrent
                      ? "border-2 border-[#183C78] bg-white text-[#183C78]"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span
                  className={[
                    "block text-xs font-semibold uppercase tracking-wide",
                    isCurrent ? "text-[#183C78]" : isCompleted ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {step.subtitle}
                </span>
              </span>
            </button>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div className="mx-3 h-0.5 flex-1 bg-border">
                <div
                  className="h-full bg-[#183C78] transition-all duration-300"
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

### Task 4: Create `step-identity.tsx`

**Files:**
- Create: `components/admin/product-wizard/step-identity.tsx`

- [ ] **Step 4.1: Create the file**

```typescript
// components/admin/product-wizard/step-identity.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryCascadingSelect, type CategoryOption } from "@/components/admin/category-cascading-select";
import type { ProductDetail } from "@/lib/db/types";

interface StepIdentityProps {
  product: ProductDetail;
  categories: CategoryOption[];
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepIdentity({
  product,
  categories,
  formRef,
  isPending,
}: StepIdentityProps) {
  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="1" />

      {/* Nom du produit */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="wiz-name">
            Nom du produit <span className="text-destructive">*</span>
          </Label>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
            title="Soyez précis : incluez la marque, le modèle, la capacité et la couleur si pertinent."
          >
            ?
          </span>
        </div>
        <Input
          id="wiz-name"
          name="name"
          required
          disabled={isPending}
          defaultValue={product.name}
          placeholder="ex: Samsung Galaxy A55 128Go Noir"
        />
        <p className="text-xs text-muted-foreground">
          Soyez précis : marque, modèle, capacité, couleur si pertinent.
        </p>
      </div>

      {/* Marque + SKU */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-brand">Marque</Label>
          <Input
            id="wiz-brand"
            name="brand"
            disabled={isPending}
            defaultValue={product.brand ?? ""}
            placeholder="ex: Samsung"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-sku">SKU</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Référence interne pour identifier ce produit dans vos stocks."
            >
              ?
            </span>
          </div>
          <Input
            id="wiz-sku"
            name="sku"
            disabled={isPending}
            defaultValue={product.sku ?? ""}
            placeholder="ex: SAM-A55-128-BLK"
            className="bg-muted/40"
          />
          <p className="text-xs text-muted-foreground">
            Laissez vide si vous n&apos;avez pas de référence interne.
          </p>
        </div>
      </div>

      {/* Catégorie */}
      <div className="space-y-1.5">
        <Label>
          Catégorie <span className="text-destructive">*</span>
        </Label>
        <CategoryCascadingSelect
          categories={categories}
          defaultCategoryId={product.category_id || undefined}
        />
      </div>

      {/* Step hint */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        💡 Le nom et la catégorie suffisent pour passer à l&apos;étape suivante.
        Vous pourrez toujours revenir pour compléter.
      </div>
    </form>
  );
}
```

---

### Task 5: Create `step-pricing.tsx`

**Files:**
- Create: `components/admin/product-wizard/step-pricing.tsx`

- [ ] **Step 5.1: Create the file**

```typescript
// components/admin/product-wizard/step-pricing.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ProductDetail } from "@/lib/db/types";

interface StepPricingProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepPricing({ product, formRef, isPending }: StepPricingProps) {
  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="2" />

      {/* Prix */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-base-price">
            Prix de vente <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupInput
              id="wiz-base-price"
              name="base_price"
              type="number"
              min={0}
              step={1}
              required
              disabled={isPending}
              defaultValue={product.base_price > 0 ? product.base_price : ""}
              placeholder="ex: 125000"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-compare-price">Prix barré</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Ancien prix avant promotion. Affiché barré sur la fiche produit."
            >
              ?
            </span>
          </div>
          <InputGroup>
            <InputGroupInput
              id="wiz-compare-price"
              name="compare_price"
              type="number"
              min={0}
              step={1}
              disabled={isPending}
              defaultValue={product.compare_price ?? ""}
              placeholder="Optionnel"
            />
            <InputGroupAddon align="inline-end">FCFA</InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Stock */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-stock">Quantité en stock</Label>
          <Input
            id="wiz-stock"
            name="stock_quantity"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.stock_quantity}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="wiz-threshold">Seuil d&apos;alerte stock</Label>
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              title="Vous serez alerté lorsque le stock passe sous ce seuil."
            >
              ?
            </span>
          </div>
          <Input
            id="wiz-threshold"
            name="low_stock_threshold"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.low_stock_threshold}
          />
        </div>
      </div>

      {/* Poids */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="wiz-weight">Poids</Label>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
            title="Utilisé pour le calcul des frais de livraison."
          >
            ?
          </span>
        </div>
        <InputGroup>
          <InputGroupInput
            id="wiz-weight"
            name="weight_grams"
            type="number"
            min={0}
            step={1}
            disabled={isPending}
            defaultValue={product.weight_grams ?? ""}
            placeholder="Optionnel"
          />
          <InputGroupAddon align="inline-end">g</InputGroupAddon>
        </InputGroup>
      </div>
    </form>
  );
}
```

---

### Task 6: Create `step-media.tsx`

**Files:**
- Create: `components/admin/product-wizard/step-media.tsx`

- [ ] **Step 6.1: Create the file**

```typescript
// components/admin/product-wizard/step-media.tsx
import dynamic from "next/dynamic";
import type { ProductDetail } from "@/lib/db/types";

const ImageManager = dynamic(() =>
  import("@/components/admin/image-manager").then((m) => m.ImageManager),
);
const VariantList = dynamic(() =>
  import("@/components/admin/variant-list").then((m) => m.VariantList),
);

interface StepMediaProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
}

export function StepMedia({ product, formRef }: StepMediaProps) {
  return (
    <form ref={formRef} className="space-y-8">
      <input type="hidden" name="_step" value="3" />

      {/* Images */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Images</h3>
          <p className="text-xs text-muted-foreground">
            Ajoutez au moins une photo avant de publier.
          </p>
        </div>

        {/* Amber hint if no images yet */}
        {product.images.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            📸 Aucune image pour l&apos;instant. Au moins une image est
            recommandée avant la publication.
          </div>
        )}

        <ImageManager productId={product.id} images={product.images} />
      </div>

      {/* Variantes */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Variantes</h3>
          <p className="text-xs text-muted-foreground">
            Ajoutez des variantes si ce produit existe en plusieurs versions
            (couleur, stockage…).
          </p>
        </div>
        <VariantList productId={product.id} variants={product.variants} />
      </div>
    </form>
  );
}
```

---

### Task 7: Create `step-finalization.tsx`

**Files:**
- Create: `components/admin/product-wizard/step-finalization.tsx`

- [ ] **Step 7.1: Create the file**

```typescript
// components/admin/product-wizard/step-finalization.tsx
"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ProductDetail } from "@/lib/db/types";

const RichTextEditor = dynamic(() =>
  import("@/components/admin/rich-text-editor").then((m) => m.RichTextEditor),
);

interface StepFinalizationProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepFinalization({
  product,
  formRef,
  isPending,
}: StepFinalizationProps) {
  const [metaTitleLen, setMetaTitleLen] = useState(
    (product.meta_title ?? "").length,
  );
  const [metaDescLen, setMetaDescLen] = useState(
    (product.meta_description ?? "").length,
  );
  const isActiveRef = useRef<HTMLInputElement>(null);
  const isFeaturedRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="4" />

      {/* Hidden inputs: all fields required by updateProduct that aren't in this step */}
      <input type="hidden" name="slug" value={product.slug} />
      <input type="hidden" name="name" value={product.name} />
      <input type="hidden" name="category_id" value={product.category_id ?? ""} />
      <input type="hidden" name="base_price" value={product.base_price} />
      <input type="hidden" name="stock_quantity" value={product.stock_quantity} />
      <input
        type="hidden"
        name="low_stock_threshold"
        value={product.low_stock_threshold}
      />
      {product.brand && (
        <input type="hidden" name="brand" value={product.brand} />
      )}
      {product.sku && <input type="hidden" name="sku" value={product.sku} />}
      {product.compare_price != null && (
        <input
          type="hidden"
          name="compare_price"
          value={product.compare_price}
        />
      )}
      {product.weight_grams != null && (
        <input
          type="hidden"
          name="weight_grams"
          value={product.weight_grams}
        />
      )}

      {/* Résumé court */}
      <div className="space-y-1.5">
        <Label htmlFor="wiz-short-desc">Résumé court</Label>
        <Input
          id="wiz-short-desc"
          name="short_description"
          disabled={isPending}
          defaultValue={product.short_description ?? ""}
          placeholder="ex: Smartphone 128Go avec triple caméra 50MP"
        />
      </div>

      {/* Description riche */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <RichTextEditor name="description" defaultValue={product.description} />
      </div>

      {/* SEO */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">SEO</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="wiz-meta-title">Titre SEO</Label>
            <span
              className={`text-xs tabular-nums ${metaTitleLen > 55 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {metaTitleLen}/60
            </span>
          </div>
          <Input
            id="wiz-meta-title"
            name="meta_title"
            maxLength={60}
            disabled={isPending}
            defaultValue={product.meta_title ?? ""}
            placeholder="Titre pour les moteurs de recherche"
            onChange={(e) => setMetaTitleLen(e.target.value.length)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="wiz-meta-desc">Meta description</Label>
            <span
              className={`text-xs tabular-nums ${metaDescLen > 140 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {metaDescLen}/160
            </span>
          </div>
          <Textarea
            id="wiz-meta-desc"
            name="meta_description"
            rows={3}
            maxLength={160}
            disabled={isPending}
            defaultValue={product.meta_description ?? ""}
            placeholder="Description pour les moteurs de recherche"
            onChange={(e) => setMetaDescLen(e.target.value.length)}
          />
        </div>
      </div>

      {/* Visibilité */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Visibilité</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Publier immédiatement</Label>
            <p className="text-xs text-muted-foreground">
              Visible sur la boutique dès la publication
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
            <Label>Mettre en avant</Label>
            <p className="text-xs text-muted-foreground">
              Affiché dans la section vedette de la page d&apos;accueil
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
      </div>
    </form>
  );
}
```

---

### Task 8: Create `product-wizard.tsx`

**Files:**
- Create: `components/admin/product-wizard.tsx`

- [ ] **Step 8.1: Create the file**

```typescript
// components/admin/product-wizard.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveDraftStep } from "@/actions/admin/products";
import { updateProduct } from "@/actions/admin/products";
import { WizardStepper } from "./product-wizard/wizard-stepper";
import { StepIdentity } from "./product-wizard/step-identity";
import { StepPricing } from "./product-wizard/step-pricing";
import { StepMedia } from "./product-wizard/step-media";
import { StepFinalization } from "./product-wizard/step-finalization";
import type { ProductDetail } from "@/lib/db/types";
import type { CategoryOption } from "./category-cascading-select";

const STEPS = [
  { label: "Identité", subtitle: "Nom · Marque · Catégorie" },
  { label: "Prix & Stock", subtitle: "Prix · Quantité" },
  { label: "Médias", subtitle: "Images · Variantes" },
  { label: "Finalisation", subtitle: "Description · SEO" },
];

function getInitialStep(product: ProductDetail): number {
  if (!product.name) return 0;
  if (!product.category_id || product.base_price === 0) return 1;
  if (!product.images.some((img) => img.is_primary === 1)) return 2;
  return 3;
}

interface ProductWizardProps {
  product: ProductDetail;
  // CategoryOption from components/admin/category-cascading-select (4 fields: id, name, depth, parent_id)
  categories: CategoryOption[];
}

export function ProductWizard({ product, categories }: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(getInitialStep(product));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleNext() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await saveDraftStep(product.id, formData);
        if (result.success) {
          setCurrentStep((prev) => prev + 1);
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  function handlePublish() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("is_active", "1");
    startTransition(async () => {
      try {
        const result = await updateProduct(product.id, formData);
        if (result.success) {
          toast.success("Produit publié");
          router.push("/products");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  function handleSaveDraft() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await saveDraftStep(product.id, formData);
        if (result.success) {
          toast.success("Brouillon enregistré");
          router.push("/products");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="flex flex-col">
      {/* Stepper */}
      <WizardStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Step content */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {currentStep === 0 && (
          <StepIdentity
            product={product}
            categories={categories}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 1 && (
          <StepPricing
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 2 && (
          <StepMedia product={product} formRef={formRef} />
        )}
        {currentStep === 3 && (
          <StepFinalization
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}

        {/* Navigation footer */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <p className="text-xs text-muted-foreground">
            {isPending ? "Enregistrement…" : "Brouillon sauvegardé automatiquement"}
          </p>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                ← Précédent
              </Button>
            )}
            {isLastStep ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSaveDraft}
                >
                  {isPending ? "…" : "Enregistrer comme brouillon"}
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handlePublish}
                >
                  {isPending ? "…" : "Publier le produit"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={isPending}
                onClick={handleNext}
              >
                {isPending ? "Enregistrement…" : "Suivant →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors related to the new files. Fix any type errors before continuing.

- [ ] **Step 8.3: Commit wizard components**

```bash
git add components/admin/product-wizard.tsx "components/admin/product-wizard/"
git commit -m "feat(admin): add ProductWizard component with 4-step guided flow"
```

---

## Chunk 3: Integration + verification

### Task 9: Update edit page + verify

**Files:**
- Modify: `app/(admin)/products/[id]/edit/page.tsx`

- [ ] **Step 9.1: Update the edit page to conditionally render wizard**

Replace the current `ProductFormSections` render with the conditional:

```typescript
// app/(admin)/products/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductFormSections } from "@/components/admin/product-form-sections";
import { ProductWizard } from "@/components/admin/product-wizard";
import { getAdminProductById } from "@/lib/db/admin/products";
import { getAllCategories } from "@/lib/db/admin/categories";
import type { CategoryOption } from "@/components/admin/category-cascading-select";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAllCategories(),
  ]);

  if (!product) notFound();

  const isNew = product.is_draft === 1;

  const categoryOptions = categories.map(
    (c): CategoryOption => ({
      id: c.id,
      name: c.name,
      depth: c.depth,
      parent_id: c.parent_id,
    }),
  );

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
      {isNew ? (
        <ProductWizard product={product} categories={categoryOptions} />
      ) : (
        <ProductFormSections product={product} categories={categoryOptions} />
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 9.3: Run full test suite**

```bash
npm run test
```

Expected: all tests pass including the new `admin-products-draft.test.ts`.

- [ ] **Step 9.4: Start dev server and manually verify the wizard**

```bash
npm run dev
```

Open http://localhost:3000/products/new in the browser and verify:

1. **Step 1 loads:** Wizard shows step 1 with name, brand, SKU, category fields and placeholder text
2. **Validation:** Clicking "Suivant" with empty name shows error toast
3. **Step advance:** Fill in name + category, click "Suivant" → moves to step 2
4. **Stepper:** Step 1 indicator turns to completed (filled navy), step 2 becomes current
5. **Navigate back:** Click step 1 in stepper → returns to step 1 with saved values
6. **Step 2:** Fill in price, click "Suivant" → moves to step 3
7. **Step 3:** Images and variants load, click "Suivant" → moves to step 4
8. **Step 4:** Description, SEO fields, toggles, and two final buttons visible
9. **Publish:** Click "Publier le produit" → redirects to /products with success toast
10. **Existing product edit:** Navigate to an existing (non-draft) product → old ProductFormSections renders unchanged

- [ ] **Step 9.5: Add `.superpowers/` to `.gitignore` if not already there**

```bash
grep -q ".superpowers" /home/superz/netereka/.gitignore || echo ".superpowers/" >> /home/superz/netereka/.gitignore
```

- [ ] **Step 9.6: Commit integration**

```bash
git add "app/(admin)/products/[id]/edit/page.tsx" .gitignore
git commit -m "feat(admin): integrate product wizard into edit page for draft products"
```

- [ ] **Step 9.7: Push branch and create PR**

```bash
git push -u origin feat/assisted-product-wizard
gh pr create \
  --title "feat(admin): guided product creation wizard" \
  --body "$(cat <<'EOF'
## Summary
- Replaces the flat 8-section product form with a guided 4-step wizard for new products
- Adds `saveDraftStep` server action for partial saves (preserves `is_draft = 1`)
- Steps: Identité → Prix & Stock → Médias → Finalisation with placeholders, helper text, and inline tooltips
- Navigation: free navigation between completed steps via clickable stepper
- Existing products (non-drafts) continue to use `ProductFormSections` unchanged

## Test plan
- [ ] Navigate to /products/new — wizard loads at step 1
- [ ] Clicking Suivant with empty name shows error toast, does not advance
- [ ] Filling name + category and clicking Suivant advances to step 2 and saves via saveDraftStep
- [ ] Clicking a completed step in the stepper navigates back freely
- [ ] Publishing from step 4 redirects to /products with success toast
- [ ] Saving as draft from step 4 preserves is_draft = 1
- [ ] Editing an existing published product still renders the old form
- [ ] All unit tests pass: npm run test

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
