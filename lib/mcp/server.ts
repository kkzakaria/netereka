import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "@/lib/mcp/context";
import { categoryTools } from "@/lib/mcp/tools/categories";
import { productTools } from "@/lib/mcp/tools/products";
import type { ToolDefinition } from "@/lib/mcp/tools/types";

export const MCP_SERVER_NAME = "netereka-admin";
export const MCP_SERVER_VERSION = "1.0.0";

export const ALL_TOOLS: ToolDefinition[] = [...categoryTools, ...productTools];

/**
 * One server per request (stateless transport) bound to the admin who owns
 * the OAuth token. Tools never see the token, only the resolved context.
 */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input) => tool.handler(ctx, input),
    );
  }
  return server;
}
