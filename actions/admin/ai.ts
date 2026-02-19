"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { getAI, TEXT_MODEL, IMAGE_MODEL } from "@/lib/ai";
import {
  productTextPrompt,
  bannerTextPrompt,
  categorySuggestionPrompt,
  bannerImagePrompt,
  productBlueprintPrompt,
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
import { getCategoryTree } from "@/lib/db/categories";
import { searchProductSpecs, searchProductImages } from "@/lib/ai/search";
import type { CategoryNode } from "@/lib/db/types";
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

const generateBlueprintInputSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().optional(),
});

const createFromBlueprintInputSchema = z.object({
  blueprint: productBlueprintSchema,
  imageUrls: z.array(z.string().url()).default([]),
});

async function runTextModel(
  system: string,
  user: string,
  retryCount = 0
): Promise<string> {
  const ai = await getAI();
  // Cast needed: Workers AI types don't include all available model strings
  const result = await ai.run(TEXT_MODEL as keyof AiModels, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = (result as { response?: string }).response ?? "";

  // Try to extract JSON from the response (LLM may wrap in markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (retryCount < 1) {
      return runTextModel(
        system +
          "\n\nIMPORTANT: Retourne UNIQUEMENT du JSON valide. Pas de texte, pas de markdown, juste l'objet JSON.",
        user,
        retryCount + 1
      );
    }
    throw new Error("Le modèle n'a pas retourné de JSON valide.");
  }

  return jsonMatch[0];
}

function flattenCategories(
  nodes: readonly CategoryNode[],
  parentName?: string
): Array<{ id: string; name: string; parentName?: string }> {
  const result: Array<{ id: string; name: string; parentName?: string }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, parentName });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, node.name));
    }
  }
  return result;
}

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

    return { success: true, data: { imageUrl: `/images/${key}` } };
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

export async function generateProductBlueprint(
  input: z.input<typeof generateBlueprintInputSchema>
): Promise<AiResult<{ blueprint: ProductBlueprint; categoryName: string; imageUrls: string[] }>> {
  await requireAdmin();

  const parsed = generateBlueprintInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const searchQuery = [parsed.data.brand, parsed.data.name]
      .filter(Boolean)
      .join(" ");

    const [specs, imageUrls] = await Promise.all([
      searchProductSpecs(searchQuery).catch((err) => {
        console.error("[admin/ai] searchProductSpecs failed:", err);
        return "";
      }),
      searchProductImages(searchQuery).catch((err) => {
        console.error("[admin/ai] searchProductImages failed:", err);
        return [] as string[];
      }),
    ]);

    const tree = await getCategoryTree();
    const categories = flattenCategories(tree);

    if (categories.length === 0) {
      return { success: false, error: "Aucune catégorie disponible." };
    }

    const validIds = new Set(categories.map((c) => c.id));
    const prompt = productBlueprintPrompt({ ...parsed.data, specs, categories });
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const raw = productBlueprintSchema.parse(JSON.parse(jsonStr));

    if (!validIds.has(raw.categoryId)) {
      return {
        success: false,
        error: "L'IA n'a pas identifié de catégorie valide. Réessayez ou sélectionnez manuellement.",
      };
    }

    const cat = categories.find((c) => c.id === raw.categoryId);
    const categoryName = cat
      ? (cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name)
      : raw.categoryId;

    return {
      success: true,
      data: { blueprint: raw, categoryName, imageUrls },
    };
  } catch (error) {
    console.error("[admin/ai] generateProductBlueprint error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de générer le produit. Réessayez.",
    };
  }
}

async function downloadImageToR2(
  imageUrl: string,
  productId: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    const id = nanoid();
    const key = `products/${productId}/${id}.jpg`;
    const file = new File([buffer], `${id}.jpg`, { type: "image/jpeg" });
    await uploadToR2(file, key);
    return `/images/${key}`;
  } catch {
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
    // 1. Insert product (draft=1, published when admin saves in editor)
    await execute(
      `INSERT INTO products (id, category_id, name, slug, description, short_description,
         base_price, sku, brand, is_active, is_draft,
         meta_title, meta_description, stock_quantity, low_stock_threshold,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 1, ?, ?, 0, 5, datetime('now'), datetime('now'))`,
      [
        id,
        blueprint.categoryId,
        blueprint.name,
        slug,
        blueprint.description || null,
        blueprint.short_description || null,
        blueprint.base_price,
        blueprint.brand || null,
        blueprint.meta_title || null,
        blueprint.meta_description || null,
      ]
    );

    // 2. Insert variants
    for (let i = 0; i < blueprint.variants.length; i++) {
      const v = blueprint.variants[i];
      const vid = nanoid();
      await execute(
        `INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity,
           attributes, is_active, sort_order)
         VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?)`,
        [
          vid,
          id,
          v.name,
          v.price,
          v.stock_quantity,
          JSON.stringify(v.attributes),
          i,
        ]
      );
    }

    // 3. Download images → R2 (best-effort, failures are silently skipped)
    for (let i = 0; i < imageUrls.length; i++) {
      const storedUrl = await downloadImageToR2(imageUrls[i], id).catch(() => null);
      if (!storedUrl) continue;
      const iid = nanoid();
      await execute(
        `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [iid, id, storedUrl, i, i === 0 ? 1 : 0]
      );
    }

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
