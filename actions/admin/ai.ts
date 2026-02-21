"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { getAI, IMAGE_MODEL } from "@/lib/ai";
import {
  productTextPrompt,
  bannerTextPrompt,
  categorySuggestionPrompt,
  bannerImagePrompt,
} from "@/lib/ai/prompts";
import { uploadToR2 } from "@/lib/storage/images";
import {
  productTextSchema,
  bannerTextSchema,
  categorySuggestionSchema,
  productBlueprintSchema,
} from "@/lib/ai/schemas";
import type {
  ProductTextResult,
  BannerTextResult,
  CategorySuggestionResult,
  ProductBlueprint,
} from "@/lib/ai/schemas";
import { execute } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { getCategoryTree } from "@/lib/db/categories";
import { searchProductSpecs } from "@/lib/ai/search";
import { runTextModel, flattenCategories } from "@/lib/ai/helpers";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

interface AiResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}

const productTextInputSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  categoryName: z.string().optional(),
  brand: z.string().optional(),
});

const bannerTextInputSchema = z.object({
  productName: z.string().optional(),
  promotion: z.string().optional(),
  theme: z.string().optional(),
});

const suggestCategoryInputSchema = z.object({
  productName: z.string().min(1, "Le nom du produit est requis"),
  description: z.string().optional(),
});

const bannerImageInputSchema = z.object({
  prompt: z.string().min(1, "Décrivez l'image souhaitée"),
  style: z.enum(["product", "abstract", "lifestyle"]).optional(),
});

const createFromBlueprintInputSchema = z.object({
  blueprint: productBlueprintSchema,
  imageUrls: z.array(z.string().url()).default([]),
});

export async function generateProductText(
  input: z.input<typeof productTextInputSchema>
): Promise<AiResult<ProductTextResult>> {
  await requireAdmin();

  const parsed = productTextInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const searchQuery = [parsed.data.brand, parsed.data.name]
      .filter(Boolean)
      .join(" ");
    const specs = await searchProductSpecs(searchQuery).catch((err) => {
      console.error("[admin/ai] searchProductSpecs failed, continuing without specs:", err);
      return "";
    });

    const prompt = productTextPrompt({ ...parsed.data, specs });
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const data = productTextSchema.parse(JSON.parse(jsonStr));
    return { success: true, data };
  } catch (error) {
    console.error("[admin/ai] generateProductText error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de générer le texte. Réessayez.",
    };
  }
}

export async function generateBannerText(
  input: z.input<typeof bannerTextInputSchema>
): Promise<AiResult<BannerTextResult>> {
  await requireAdmin();

  const parsed = bannerTextInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  try {
    const prompt = bannerTextPrompt(parsed.data);
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const data = bannerTextSchema.parse(JSON.parse(jsonStr));
    return { success: true, data };
  } catch (error) {
    console.error("[admin/ai] generateBannerText error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de générer le texte. Réessayez.",
    };
  }
}

export async function suggestCategory(
  input: z.input<typeof suggestCategoryInputSchema>
): Promise<AiResult<CategorySuggestionResult>> {
  await requireAdmin();

  const parsed = suggestCategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const tree = await getCategoryTree();
    const categories = flattenCategories(tree);

    if (categories.length === 0) {
      return { success: false, error: "Aucune catégorie disponible." };
    }

    const validIds = new Set(categories.map((c) => c.id));
    const prompt = categorySuggestionPrompt({ ...parsed.data, categories });
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const raw = categorySuggestionSchema.parse(JSON.parse(jsonStr));

    // Filter out hallucinated category IDs
    const filtered = raw.suggestions.filter((s) => validIds.has(s.categoryId));

    if (filtered.length === 0) {
      return {
        success: false,
        error: "L'IA n'a pas pu identifier de catégorie valide. Sélectionnez manuellement.",
      };
    }

    return { success: true, data: { suggestions: filtered } };
  } catch (error) {
    console.error("[admin/ai] suggestCategory error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de suggérer une catégorie. Réessayez.",
    };
  }
}

export async function generateBannerImage(
  input: z.input<typeof bannerImageInputSchema>
): Promise<AiResult<{ imageUrl: string }>> {
  await requireAdmin();

  const parsed = bannerImageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Décrivez l'image souhaitée." };
  }

  try {
    const ai = await getAI();
    const prompt = bannerImagePrompt(parsed.data);
    // Cast needed: Workers AI types don't include all available model strings
    const imageData = await ai.run(IMAGE_MODEL as keyof AiModels, { prompt });

    // Workers AI returns a ReadableStream or Uint8Array for image models
    let bytes: Uint8Array;
    if (imageData instanceof ReadableStream) {
      bytes = new Uint8Array(await new Response(imageData).arrayBuffer());
    } else if (imageData instanceof Uint8Array) {
      bytes = imageData;
    } else if (imageData instanceof ArrayBuffer) {
      bytes = new Uint8Array(imageData);
    } else {
      throw new Error("Format de réponse image inattendu");
    }

    if (bytes.length === 0) {
      return { success: false, error: "Le modèle a retourné une image vide. Réessayez." };
    }

    const key = `banners/ai-${nanoid()}.png`;
    const file = new File([bytes] as BlobPart[], "generated.png", { type: "image/png" });
    await uploadToR2(file, key);

    return { success: true, data: { imageUrl: key } };
  } catch (error) {
    console.error("[admin/ai] generateBannerImage error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de générer l'image. Réessayez.",
    };
  }
}

async function downloadImageToR2(
  imageUrl: string,
  productId: string
): Promise<string | null> {
  // SSRF guard: only allow HTTPS URLs
  try {
    if (new URL(imageUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }

  // Fetch image — network/timeout failures are expected for third-party URLs
  let buffer: ArrayBuffer | null = null;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    buffer = buf.byteLength > 0 ? buf : null;
  } catch (err) {
    console.warn("[admin/ai] downloadImageToR2: fetch failed for", imageUrl, err);
    return null;
  }
  if (!buffer) return null;

  // Upload to R2 — infrastructure failures are unexpected and should be logged
  try {
    const imgId = nanoid();
    const key = `products/${productId}/${imgId}.jpg`;
    await uploadToR2(new File([buffer], `${imgId}.jpg`, { type: "image/jpeg" }), key);
    return key;
  } catch (err) {
    console.error("[admin/ai] R2 upload failed for product", productId, err);
    return null;
  }
}

export async function createProductFromBlueprint(
  input: z.input<typeof createFromBlueprintInputSchema>
): Promise<AiResult<never> & { id?: string }> {
  await requireAdmin();

  const parsed = createFromBlueprintInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const { blueprint, imageUrls } = parsed.data;
  const id = nanoid();
  const slug = `${slugify(blueprint.name)}-${nanoid(6)}`;

  try {
    const db = await getDB();

    // 1. Insert product + variants atomically to prevent orphaned rows on failure
    const productStmt = db
      .prepare(
        `INSERT INTO products (id, category_id, name, slug, description, short_description,
           base_price, sku, brand, is_active, is_draft,
           meta_title, meta_description, stock_quantity, low_stock_threshold,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 1, ?, ?, 0, 5, datetime('now'), datetime('now'))`
      )
      .bind(
        id,
        blueprint.categoryId,
        blueprint.name,
        slug,
        blueprint.description || null,
        blueprint.short_description || null,
        0,
        blueprint.brand || null,
        blueprint.meta_title || null,
        blueprint.meta_description || null
      );

    const variantStmts = blueprint.variants.map((v, i) =>
      db
        .prepare(
          `INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity,
             attributes, is_active, sort_order)
           VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?)`
        )
        .bind(nanoid(), id, v.name, 0, v.stock_quantity, JSON.stringify(v.attributes), i)
    );

    await db.batch([productStmt, ...variantStmts]);

    // 2. Download images → R2 in parallel (best-effort, failures are silently skipped)
    const downloadedUrls = (
      await Promise.all(imageUrls.map((url) => downloadImageToR2(url, id)))
    ).filter((u): u is string => u !== null);

    // 3. Insert image records; first successful download gets is_primary = 1.
    // Individual failures are non-fatal — the product was already created.
    await Promise.all(
      downloadedUrls.map((storedUrl, i) => {
        const iid = nanoid();
        return execute(
          `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary)
           VALUES (?, ?, ?, NULL, ?, ?)`,
          [iid, id, storedUrl, i, i === 0 ? 1 : 0]
        ).catch((err) => {
          console.error("[admin/ai] Failed to insert image record for product", id, err);
        });
      })
    );

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, id };
  } catch (error) {
    console.error("[admin/ai] createProductFromBlueprint error:", error);
    return {
      success: false,
      error: "Erreur lors de la création du produit. Réessayez.",
    };
  }
}
