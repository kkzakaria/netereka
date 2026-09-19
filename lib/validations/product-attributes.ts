import { z } from "zod";

/**
 * Shared product attribute schemas (colors, dimensions, specs).
 *
 * Extracted from the now-removed `product-ai.ts` — the MCP tools
 * (`lib/validations/mcp-product.ts`) reuse them so a draft written via MCP
 * cannot carry attributes the admin wizard would reject.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)");

export const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: hexColor,
});

export const dimensionsSchema = z.object({
  length_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
  width_mm:  z.number().int().positive().optional(),
  weight_g:  z.number().int().positive().optional(),
});

export const specSchema = z.object({
  name:  z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});
