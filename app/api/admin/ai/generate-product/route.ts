import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { productBlueprintSchema } from "@/lib/ai/schemas";
import { getCategoryTree } from "@/lib/db/categories";
import { searchProductSpecs, searchProductImages } from "@/lib/ai/search";
import { encodeSSE, type SSEEvent } from "@/lib/ai/stream";
import { runTextModel, flattenCategories } from "@/lib/ai/helpers";
import { productBlueprintPrompt } from "@/lib/ai/prompts";

const requestSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  // Auth check — requireAdmin() calls redirect() on auth failure, which throws NEXT_REDIRECT.
  // Re-throw NEXT_REDIRECT so Next.js can handle it; convert other throws to 401.
  try {
    await requireAdmin();
  } catch (err) {
    if (
      err instanceof Error &&
      "digest" in err &&
      String((err as Error & { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[route/generate-product] requireAdmin threw unexpectedly:", err);
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
  } catch (err) {
    console.error("[route/generate-product] Failed to parse request body:", err);
    return new Response(
      JSON.stringify({ error: "Corps de requête invalide." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: SSEEvent) => {
        controller.enqueue(encodeSSE(payload));
      };

      // Guarantee controller.close() is called exactly once, even if send() throws
      let closed = false;
      const closeOnce = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        send({ type: "status", message: "Recherche d'informations..." });

        const searchQuery = [parsed.brand, parsed.name].filter(Boolean).join(" ");

        const [specs, imageUrls, tree] = await Promise.all([
          searchProductSpecs(searchQuery).catch((err) => {
            console.error("[route/generate-product] searchProductSpecs failed:", err);
            return "";
          }),
          searchProductImages(searchQuery).catch((err) => {
            console.error("[route/generate-product] searchProductImages failed:", err);
            return [] as string[];
          }),
          getCategoryTree().catch((err) => {
            console.error("[route/generate-product] getCategoryTree failed:", err);
            throw new Error("Impossible de charger les catégories. Réessayez.");
          }),
        ]);

        const categories = flattenCategories(tree);

        if (categories.length === 0) {
          send({ type: "error", message: "Aucune catégorie disponible." });
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
            message:
              error instanceof Error && error.message.startsWith("Impossible de charger")
                ? error.message
                : "Impossible de générer le produit. Réessayez.",
          });
        }
      } finally {
        closeOnce();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
