import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { callTextModel } from "@/lib/ai";
import { productBlueprintPrompt } from "@/lib/ai/prompts";
import { productBlueprintSchema } from "@/lib/ai/schemas";
import { getCategoryTree } from "@/lib/db/categories";
import { searchProductSpecs, searchProductImages } from "@/lib/ai/search";
import { encodeSSE } from "@/lib/ai/stream";
import type { CategoryNode } from "@/lib/db/types";

const requestSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().optional(),
});

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

async function runTextModel(
  system: string,
  user: string,
  retryCount = 0
): Promise<string> {
  const raw = await callTextModel(system, user);
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {
        // fall through to retry
      }
    }
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
}

export async function POST(request: Request): Promise<Response> {
  // Auth check
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let parsed: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Le nom du produit est requis." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    parsed = result.data;
  } catch {
    return new Response(
      JSON.stringify({ error: "Corps de requête invalide." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encodeSSE(payload));
      };

      try {
        send({ type: "status", message: "Recherche d'informations..." });

        const searchQuery = [parsed.brand, parsed.name].filter(Boolean).join(" ");

        const [[specs, imageUrls], tree] = await Promise.all([
          Promise.all([
            searchProductSpecs(searchQuery).catch((err) => {
              console.error("[route/generate-product] searchProductSpecs failed:", err);
              return "";
            }),
            searchProductImages(searchQuery).catch((err) => {
              console.error("[route/generate-product] searchProductImages failed:", err);
              return [] as string[];
            }),
          ]),
          getCategoryTree(),
        ]);

        const categories = flattenCategories(tree);

        if (categories.length === 0) {
          send({ type: "error", message: "Aucune catégorie disponible." });
          controller.close();
          return;
        }

        send({ type: "status", message: "Génération du blueprint produit..." });

        const validIds = new Set(categories.map((c) => c.id));
        const prompt = productBlueprintPrompt({ ...parsed, specs, categories });
        const jsonStr = await runTextModel(prompt.system, prompt.user);
        const blueprint = productBlueprintSchema.parse(JSON.parse(jsonStr));

        if (!validIds.has(blueprint.categoryId)) {
          send({
            type: "error",
            message:
              "L'IA n'a pas identifié de catégorie valide. Réessayez ou sélectionnez manuellement.",
          });
          controller.close();
          return;
        }

        const cat = categories.find((c) => c.id === blueprint.categoryId);
        const categoryName = cat
          ? cat.parentName
            ? `${cat.parentName} > ${cat.name}`
            : cat.name
          : blueprint.categoryId;

        send({ type: "done", blueprint, categoryName, imageUrls });
      } catch (error) {
        console.error("[route/generate-product] error:", error);
        if (error instanceof Error && error.message.includes("429")) {
          send({
            type: "error",
            message: "Limite IA quotidienne atteinte. Réessayez demain.",
          });
        } else {
          send({
            type: "error",
            message: "Impossible de générer le produit. Réessayez.",
          });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
