import { describe, it, expect, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { ALL_TOOLS, createMcpServer, MCP_SERVER_NAME } from "@/lib/mcp/server";

describe("createMcpServer", () => {
  it("enregistre tous les outils avec description et schéma", () => {
    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    expect(server).toBeDefined();
    expect(ALL_TOOLS.length).toBe(9);
    for (const t of ALL_TOOLS) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(typeof t.inputSchema).toBe("object");
    }
  });

  it("expose les 9 outils à un vrai client MCP via un transport en mémoire", async () => {
    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: "test-client", version: "0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      expect(client.getServerVersion()?.name).toBe(MCP_SERVER_NAME);

      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "add_product_images", "create_product_draft", "delete_product_draft", "get_product_draft",
        "list_categories", "remove_product_image", "search_products", "set_product_variants", "update_product_draft",
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
