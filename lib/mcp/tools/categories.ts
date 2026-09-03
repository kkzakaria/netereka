import { getCategoryTree } from "@/lib/db/categories";
import type { CategoryNode } from "@/lib/db/types";
import { ok, fail } from "@/lib/mcp/result";
import { defineTool, type ToolDefinition } from "./types";

interface CategoryOut { id: string; name: string; slug: string; children: CategoryOut[] }

function strip(nodes: readonly CategoryNode[]): CategoryOut[] {
  return nodes.map((n) => ({ id: n.id, name: n.name, slug: n.slug, children: strip(n.children) }));
}

export const categoryTools: ToolDefinition[] = [
  defineTool({
    name: "list_categories",
    description:
      "Liste l'arbre des catégories actives de la boutique (2 niveaux max). Utilise l'id retourné comme category_id pour create_product_draft.",
    inputSchema: {},
    handler: async () => {
      try {
        return ok(strip(await getCategoryTree()));
      } catch (err) {
        console.error("[mcp/list_categories]", err);
        return fail("internal_error", "Impossible de lire les catégories");
      }
    },
  }),
];
