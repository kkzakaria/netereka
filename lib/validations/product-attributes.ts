import { z } from "zod";
import { objetStrict } from "./mcp-common";

/**
 * Shared product attribute schemas (colors, dimensions, specs).
 *
 * Extracted from the now-removed `product-ai.ts` — the MCP tools
 * (`lib/validations/mcp-product.ts`) reuse them so a draft written via MCP
 * cannot carry attributes the admin wizard would reject.
 *
 * « Shared » décrit une intention, pas l'état actuel : au 2026-10-03 le SEUL
 * importateur est `mcp-product.ts`, vérifié. C'est ce qui autorise les chemins
 * MCP écrits en dur ci-dessous (`"attributes.colors[]"`…) dans les messages de
 * refus. Le jour où un formulaire d'administration réemploie ces schémas, ces
 * chemins nommeront une position absente de SON entrée : il faudra alors les
 * passer en paramètre plutôt que de les figer ici.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)");

export const colorSchema = objetStrict({
  name: z.string().trim().min(1).max(40),
  hex: hexColor,
}, "attributes.colors[]");

export const dimensionsSchema = objetStrict({
  length_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
  width_mm:  z.number().int().positive().optional(),
  weight_g:  z.number().int().positive().optional(),
}, "attributes.dimensions");

export const specSchema = objetStrict({
  name:  z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
}, "attributes.specs[]");
