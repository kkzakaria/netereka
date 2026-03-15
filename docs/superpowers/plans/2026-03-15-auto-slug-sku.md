# Auto-génération Slug & SKU — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer les champs slug et SKU du formulaire admin produit et les générer automatiquement côté serveur.

**Architecture:** Modifier `updateProduct` pour lire le state existant en DB et générer automatiquement slug (sur premier enregistrement) et SKU (si null). Mettre à jour le formulaire pour supprimer le champ slug et afficher le SKU en lecture seule.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, Cloudflare D1, nanoid, Vitest

---

## Chunk 1: Server action

### Task 1: Tests pour la nouvelle logique `updateProduct`

**Files:**
- Create: `__tests__/unit/actions/admin-products.test.ts`

- [ ] **Step 1: Créer le fichier de test avec les mocks**

```typescript
// __tests__/unit/actions/admin-products.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  queryFirst: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
  nanoid: vi.fn(),
  slugify: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
  query: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("nanoid", () => ({ nanoid: mocks.nanoid }));
vi.mock("@/lib/utils", () => ({ slugify: mocks.slugify }));

import { updateProduct } from "@/actions/admin/products";

const baseFormData = (overrides: Record<string, string> = {}) => {
  const fd = new FormData();
  fd.append("name", "iPhone 15 Pro");
  fd.append("category_id", "cat-1");
  fd.append("brand", "Apple");
  fd.append("base_price", "850000");
  fd.append("stock_quantity", "10");
  fd.append("low_stock_threshold", "5");
  fd.append("is_active", "1");
  fd.append("is_featured", "0");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
};

describe("updateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
  });

  describe("product introuvable", () => {
    it("retourne une erreur si le produit n'existe pas en base", async () => {
      mocks.queryFirst.mockResolvedValueOnce(null);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Produit introuvable" });
      expect(mocks.execute).not.toHaveBeenCalled();
    });
  });

  describe("produit déjà publié (is_draft = 0)", () => {
    it("préserve le slug existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro"])
      );
      expect(mocks.slugify).not.toHaveBeenCalled();
    });

    it("préserve le SKU existant sans le régénérer", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-ABCD1234"])
      );
      expect(mocks.nanoid).not.toHaveBeenCalled();
    });

    it("n'appelle pas revalidatePath sur /p/ si produit déjà publié", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "iphone-15-pro", sku: "NET-ABCD1234", is_draft: 0 });
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/p/iphone-15-pro");
    });
  });

  describe("nouveau produit draft (is_draft = 1)", () => {
    it("génère un slug depuis le nom si is_draft = 1", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null); // slug "iphone-15-pro" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro"])
      );
    });

    it("génère slug avec suffixe -2 si base déjà pris", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce({ id: "other-prod" }) // "iphone-15-pro" pris
        .mockResolvedValueOnce(null); // "iphone-15-pro-2" libre
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("ABCD1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["iphone-15-pro-2"])
      );
    });

    it("retourne une erreur si slugify produit une chaîne vide", async () => {
      mocks.queryFirst.mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 });
      mocks.slugify.mockReturnValue("");
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Le nom ne permet pas de générer un slug valide" });
      expect(mocks.execute).not.toHaveBeenCalled();
    });

    it("génère un SKU au format NET-XXXXXXXX si sku = null", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-ABCD1234"])
      );
    });

    it("réessaie la génération SKU en cas de collision UNIQUE constraint", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid
        .mockReturnValueOnce("aaaaaaaa") // 1er SKU — collision
        .mockReturnValueOnce("bbbbbbbb"); // 2e SKU — succès
      mocks.execute
        .mockRejectedValueOnce(new Error("UNIQUE constraint failed: products.sku"))
        .mockResolvedValueOnce(undefined);
      const result = await updateProduct("prod-1", baseFormData());
      expect(result.success).toBe(true);
      expect(mocks.execute).toHaveBeenCalledTimes(2);
      expect(mocks.execute).toHaveBeenLastCalledWith(
        expect.stringContaining("UPDATE products"),
        expect.arrayContaining(["NET-BBBBBBBB"])
      );
    });

    it("retourne une erreur après 3 collisions SKU consécutives", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("xxxxxxxx");
      mocks.execute.mockRejectedValue(new Error("UNIQUE constraint failed: products.sku"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Impossible de générer un SKU unique, veuillez réessayer" });
      expect(mocks.execute).toHaveBeenCalledTimes(3);
    });

    it("propage les erreurs execute non liées à une contrainte unique", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockRejectedValue(new Error("D1 unavailable"));
      await expect(updateProduct("prod-1", baseFormData())).rejects.toThrow("D1 unavailable");
    });

    it("retourne une erreur de conflit slug lors d'une collision slug pendant la génération de SKU", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockRejectedValue(new Error("UNIQUE constraint failed: products.slug"));
      const result = await updateProduct("prod-1", baseFormData());
      expect(result).toEqual({ success: false, error: "Conflit de slug, veuillez réessayer" });
    });

    it("appelle revalidatePath sur /p/{slug} lors de la première publication", async () => {
      mocks.queryFirst
        .mockResolvedValueOnce({ slug: "draft-abc", sku: null, is_draft: 1 })
        .mockResolvedValueOnce(null);
      mocks.slugify.mockReturnValue("iphone-15-pro");
      mocks.nanoid.mockReturnValue("abcd1234");
      mocks.execute.mockResolvedValueOnce(undefined);
      await updateProduct("prod-1", baseFormData());
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/iphone-15-pro");
    });
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
npm run test -- __tests__/unit/actions/admin-products.test.ts
```

Résultat attendu : plusieurs tests FAIL (logique absente)

---

### Task 2: Implémenter les changements dans `updateProduct`

**Files:**
- Modify: `actions/admin/products.ts`

- [ ] **Step 3: Modifier `productSchema` — remplacer la ligne slug**

Dans `actions/admin/products.ts`, remplacer :
```typescript
slug: z.string().min(1),
```
par :
```typescript
slug: z.string().optional().default(""),
```

- [ ] **Step 4: Réécrire `updateProduct`**

Remplacer entièrement la fonction `updateProduct` (lignes 87–151) par :

```typescript
export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const raw = Object.fromEntries(formData);

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;

  // Fetch existing product to preserve slug and SKU
  const existing = await queryFirst<{ slug: string; sku: string | null; is_draft: number }>(
    "SELECT slug, sku, is_draft FROM products WHERE id = ?",
    [id]
  );
  if (!existing) return { success: false, error: "Produit introuvable" };

  // Slug: generate on first save (draft), preserve thereafter
  let finalSlug: string;
  if (existing.is_draft === 1) {
    const base = slugify(data.name);
    if (!base) return { success: false, error: "Le nom ne permet pas de générer un slug valide" };

    let candidate = base;
    let suffix = 1;
    while (suffix <= 100) {
      const taken = await queryFirst<{ id: string }>(
        "SELECT id FROM products WHERE slug = ? LIMIT 1",
        [candidate]
      );
      if (!taken) break;
      suffix++;
      candidate = `${base}-${suffix}`;
    }
    if (suffix > 100) {
      return { success: false, error: "Impossible de générer un slug unique pour ce nom" };
    }
    finalSlug = candidate;
  } else {
    finalSlug = existing.slug;
  }

  // SKU: generate if null (new or migrated product), preserve otherwise
  const finalSku = existing.sku;
  if (finalSku === null) {
    let skuWritten = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const generatedSku = `NET-${nanoid(8).toUpperCase()}`;
      try {
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
            finalSlug,
            data.description || null,
            data.short_description || null,
            data.base_price,
            data.compare_price ?? null,
            generatedSku,
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
        skuWritten = true;
        break;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("UNIQUE constraint failed: products.slug")) {
          return { success: false, error: "Conflit de slug, veuillez réessayer" };
        }
        if (!msg.includes("UNIQUE constraint failed: products.sku")) throw err;
        // SKU collision — retry
      }
    }
    if (!skuWritten) {
      return { success: false, error: "Impossible de générer un SKU unique, veuillez réessayer" };
    }
  } else {
    try {
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
          finalSlug,
          data.description || null,
          data.short_description || null,
          data.base_price,
          data.compare_price ?? null,
          finalSku,
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
    } catch (err) {
      if ((err as Error).message.includes("UNIQUE constraint failed: products.slug")) {
        return { success: false, error: "Conflit de slug, veuillez réessayer" };
      }
      throw err;
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}/edit`);
  revalidatePath("/dashboard");
  if (existing.is_draft === 1) {
    revalidatePath("/p/" + finalSlug);
  }
  return { success: true, id };
}
```

- [ ] **Step 5: Lancer les tests**

```bash
npm run test -- __tests__/unit/actions/admin-products.test.ts
```

Résultat attendu : tous les tests PASS

- [ ] **Step 6: Lancer tous les tests pour vérifier l'absence de régression**

```bash
npm run test
```

Résultat attendu : suite complète verte (les `stderr` D1 unavailable existants sont normaux)

- [ ] **Step 7: Vérifier les types TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur

- [ ] **Step 8: Commit**

```bash
git checkout -b feat/auto-slug-sku
git add actions/admin/products.ts "__tests__/unit/actions/admin-products.test.ts"
git commit -m "feat(admin): auto-generate slug and SKU in updateProduct"
```

---

## Chunk 2: UI

### Task 3: Mettre à jour le formulaire produit

**Files:**
- Modify: `components/admin/product-form-sections.tsx`

- [ ] **Step 1: Supprimer le bloc slug (lignes 86–94)**

Dans la section "Informations générales", supprimer entièrement :
```tsx
<div className="space-y-2">
  <Label htmlFor="slug">Slug</Label>
  <Input
    id="slug"
    name="slug"
    defaultValue={isNew ? "" : product.slug}
    placeholder="Auto-généré si vide"
  />
</div>
```

- [ ] **Step 2: Refactorer le bloc brand + SKU**

La grille 2-colonnes actuelle (lignes 95–114) deviendrait cassée avec une seule cellule. Remplacer entièrement le bloc `<div className="grid gap-4 sm:grid-cols-2">` par :

```tsx
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
  {!isNew && product.sku && (
    <div className="space-y-2">
      <Label>SKU</Label>
      <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
    </div>
  )}
</div>
```

Quand `!isNew && product.sku` est faux (draft ou pas encore de SKU), la grille n'a qu'un enfant : brand prend la colonne de gauche, la droite reste vide — comportement CSS grid normal et visuellement propre.

- [ ] **Step 3: Supprimer l'import `Input` si plus utilisé ailleurs dans le fichier**

Vérifier si `Input` est encore utilisé dans le fichier. Si non, retirer l'import :
```typescript
import { Input } from "@/components/ui/input";
```

Note : `Input` est utilisé pour les champs `name`, `brand`, `short_description` — le laisser.

- [ ] **Step 4: Vérifier les types TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur

- [ ] **Step 5: Vérifier le lint**

```bash
npm run lint
```

Résultat attendu : aucune erreur

- [ ] **Step 6: Lancer tous les tests**

```bash
npm run test
```

Résultat attendu : suite complète verte

- [ ] **Step 7: Commit**

```bash
git add "components/admin/product-form-sections.tsx"
git commit -m "feat(admin): remove slug/SKU inputs from product form"
```

- [ ] **Step 8: Créer la PR**

```bash
gh pr create --title "feat(admin): auto-generate slug and SKU on product save" --body "$(cat <<'EOF'
## Summary
- Slug auto-generated from product name on first save (with deduplication suffix -2, -3…), preserved on subsequent edits
- SKU auto-generated as NET-XXXXXXXX on first save, preserved thereafter
- Both fields hidden from the product form; SKU displayed as read-only text in edit mode

## Test plan
- [ ] Create a new product → verify slug matches the name (slugified) and SKU starts with NET-
- [ ] Edit the product name → verify slug is unchanged
- [ ] Verify the storefront page /p/{slug} loads correctly after first save

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
