import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { McpContext } from "@/lib/mcp/context";
import { bannerTools } from "@/lib/mcp/tools/banners";
import { categoryTools } from "@/lib/mcp/tools/categories";
import { imageTools } from "@/lib/mcp/tools/images";
import { productTools } from "@/lib/mcp/tools/products";
import type { ToolDefinition } from "@/lib/mcp/tools/types";

export const MCP_SERVER_NAME = "netereka-admin";
export const MCP_SERVER_VERSION = "1.0.0";

export const ALL_TOOLS: ToolDefinition[] = [...categoryTools, ...productTools, ...bannerTools, ...imageTools];

/**
 * One server per request (stateless transport) bound to the admin who owns
 * the OAuth token. Tools never see the token, only the resolved context.
 */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      // Le SDK v2 veut un schéma objet ; les outils déclarent une forme brute
      // (voir lib/mcp/tools/types.ts). L'adaptation se fait ici, une seule fois,
      // plutôt que dans les douze définitions.
      { description: tool.description, inputSchema: z.object(tool.inputSchema) },
      async (input) => tool.handler(ctx, input),
    );
  }
  return server;
}
