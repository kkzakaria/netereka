import { describe, it, expect, vi } from "vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { ALL_TOOLS, createMcpServer, MCP_SERVER_NAME } from "@/lib/mcp/server";

describe("createMcpServer", () => {
  it("enregistre tous les outils avec description et schéma", () => {
    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    expect(server).toBeDefined();
    expect(ALL_TOOLS.length).toBe(20);
    for (const t of ALL_TOOLS) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(typeof t.inputSchema).toBe("object");
    }
  });

  it("expose les 20 outils à un vrai client MCP via un transport en mémoire", async () => {
    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: "test-client", version: "0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      expect(client.getServerVersion()?.name).toBe(MCP_SERVER_NAME);

      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "add_product_images", "create_banner", "create_product_draft", "delete_product_draft",
        "generate_product_image", "get_banner", "get_product", "get_product_draft",
        "list_categories", "publish_product", "reactivate_product", "remove_product_image", "search_product_images", "search_products", "set_product_variants",
        "update_banner", "update_product", "update_product_draft", "withdraw_banner", "withdraw_product",
      ]);
      for (const tool of tools) {
        expect(tool.description?.length ?? 0).toBeGreaterThan(0);
        expect(typeof tool.inputSchema).toBe("object");
      }
    } finally {
      await client.close();
    }
  });
});
