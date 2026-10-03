import type { z, ZodRawShape } from "zod";
import type { McpContext } from "@/lib/mcp/context";
import type { ToolResult } from "@/lib/mcp/result";

/**
 * One MCP tool. `inputSchema` is a raw Zod shape. `lib/mcp/server.ts` wraps it
 * in `z.strictObject()` at registration (the v2 SDK wants an object schema);
 * the SDK then validates and rejects invalid params with JSON-RPC -32602
 * before `handler` runs.
 *
 * STRICT : un champ que la forme ne déclare pas est REFUSÉ en le nommant, et le
 * refus liste les champs acceptés. Il était auparavant ÉLAGUÉ en silence — un
 * assistant a écrit `base_price`, reçu un succès, et le prix est resté à 0.
 * Les objets imbriqués (`pricing`, `seo`, `attributes`, les éléments de
 * `images[]` et `variants[]`) le sont aussi, par `objetStrict` de
 * `lib/validations/mcp-common.ts` : sans eux, le même silence survivait un cran
 * plus bas, et le message de la racine y conduisait l'appelant.
 */
export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: Shape;
  handler: (ctx: McpContext, input: z.infer<z.ZodObject<Shape>>) => Promise<ToolResult>;
}

/**
 * Infers the handler's input type from the shape, then widens to the base
 * ToolDefinition so heterogeneous tools can live in one array. The widening
 * is a cast because handler parameters are contravariant under
 * strictFunctionTypes; the SDK re-validates the input at runtime anyway.
 */
export function defineTool<Shape extends ZodRawShape>(def: ToolDefinition<Shape>): ToolDefinition {
  return def as unknown as ToolDefinition;
}
