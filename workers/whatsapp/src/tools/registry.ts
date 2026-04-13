import type { ToolDefinition, ToolResult } from "../types";
import { searchProducts, getProduct, getCategories } from "./catalogue";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the NETEREKA product catalogue. Use when the customer asks about products, wants recommendations, or searches for items.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (product name, brand, type)",
          },
          category_slug: {
            type: "string",
            description: "Optional category slug to filter by",
          },
          limit: {
            type: "number",
            description: "Max results (default 5, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description:
        "Get detailed information about a specific product including variants and stock. Use when the customer asks for details about a particular product.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Product slug (URL identifier)",
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description:
        "List product categories. Use when the customer wants to browse by category or asks what types of products are available.",
      parameters: {
        type: "object",
        properties: {
          parent_slug: {
            type: "string",
            description: "Parent category slug to list subcategories. Omit for top-level categories.",
          },
        },
      },
    },
  },
];

export async function dispatchTool(
  db: D1Database,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(db, args as { query: string; category_slug?: string; limit?: number });
    case "get_product":
      return getProduct(db, args as { slug: string });
    case "get_categories":
      return getCategories(db, args as { parent_slug?: string });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
