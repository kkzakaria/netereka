import type { z, ZodRawShape } from "zod";
import type { McpContext } from "@/lib/mcp/context";
import type { ToolResult } from "@/lib/mcp/result";

/**
 * One MCP tool. `inputSchema` is a raw Zod shape (what the SDK's registerTool
 * takes); the SDK validates and rejects invalid params with JSON-RPC -32602
 * before `handler` runs.
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
