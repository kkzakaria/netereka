import type { ToolContext, ToolDefinition, ToolResult } from "../types";
import { searchProducts, getProduct, getCategories } from "./catalogue";
import { cartAdd, cartView, cartUpdate, cartRemove, cartClear } from "./cart";
import { getDeliveryZones } from "./delivery";
import { createOrder, getOrderStatus, listOrders } from "./orders";
import { linkAccount, verifyOtp } from "./account";
import { escalateHuman } from "./escalation";

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
  {
    type: "function",
    function: {
      name: "cart_add",
      description: "Add a product to the WhatsApp cart. Use after the customer confirms they want an item.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID" },
          variant_id: { type: "string", description: "Variant ID (required if product has variants)" },
          quantity: { type: "number", description: "Quantity (default 1)" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_view",
      description: "Show the current WhatsApp cart contents and subtotal.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_update",
      description: "Update the quantity of an item in the cart.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Cart item ID" },
          quantity: { type: "number", description: "New quantity (0 to remove)" },
        },
        required: ["item_id", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_remove",
      description: "Remove an item from the cart.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Cart item ID to remove" },
        },
        required: ["item_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cart_clear",
      description: "Clear all items from the cart.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_delivery_zones",
      description: "List available delivery zones with fees. Use when customer asks about delivery areas or costs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Place an order from the current WhatsApp cart. Requires a linked account. Collects delivery address, commune, and phone.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Full delivery address" },
          commune: { type: "string", description: "Delivery commune (must match a delivery zone)" },
          phone: { type: "string", description: "Contact phone for delivery" },
          instructions: { type: "string", description: "Optional delivery instructions" },
        },
        required: ["address", "commune", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Check the status of an order by its number.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Order number (e.g., ORD-A3K9Z2)" },
        },
        required: ["order_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List recent orders for the linked customer account.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max orders to return (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_account",
      description: "Link a NETEREKA account to this WhatsApp number by sending an OTP to the customer's email.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Customer's NETEREKA account email" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_otp",
      description: "Verify the OTP code sent to the customer's email to complete account linking.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "6-digit verification code" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_human",
      description: "Transfer the conversation to a human agent. Use when the customer is frustrated, has a complex issue, or explicitly asks to speak to a person.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief reason for escalation" },
        },
        required: ["reason"],
      },
    },
  },
];

export async function dispatchTool(
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(ctx, args as { query: string; category_slug?: string; limit?: number });
    case "get_product":
      return getProduct(ctx, args as { slug: string });
    case "get_categories":
      return getCategories(ctx, args as { parent_slug?: string });
    case "cart_add":
      return cartAdd(ctx, args as { product_id: string; variant_id?: string; quantity?: number });
    case "cart_view":
      return cartView(ctx);
    case "cart_update":
      return cartUpdate(ctx, args as { item_id: string; quantity: number });
    case "cart_remove":
      return cartRemove(ctx, args as { item_id: string });
    case "cart_clear":
      return cartClear(ctx);
    case "get_delivery_zones":
      return getDeliveryZones(ctx);
    case "create_order":
      return createOrder(ctx, args as { address: string; commune: string; phone: string; instructions?: string });
    case "get_order_status":
      return getOrderStatus(ctx, args as { order_number: string });
    case "list_orders":
      return listOrders(ctx, args as { limit?: number });
    case "link_account":
      return linkAccount(ctx, args as { email: string });
    case "verify_otp":
      return verifyOtp(ctx, args as { code: string });
    case "escalate_human":
      return escalateHuman(ctx, args as { reason: string });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
