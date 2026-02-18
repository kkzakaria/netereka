"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getAI, TEXT_MODEL } from "@/lib/ai";
import {
  productTextPrompt,
  bannerTextPrompt,
  categorySuggestionPrompt,
} from "@/lib/ai/prompts";
import {
  productTextSchema,
  bannerTextSchema,
  categorySuggestionSchema,
} from "@/lib/ai/schemas";
import type {
  ProductTextResult,
  BannerTextResult,
  CategorySuggestionResult,
} from "@/lib/ai/schemas";
import { getCategoryTree } from "@/lib/db/categories";
import type { CategoryNode } from "@/lib/db/types";

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
    const prompt = productTextPrompt(parsed.data);
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

    return {
      success: true,
      data: {
        suggestions:
          filtered.length > 0 ? filtered : raw.suggestions.slice(0, 1),
      },
    };
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
