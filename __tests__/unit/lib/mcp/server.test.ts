import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { ALL_TOOLS, createMcpServer } from "@/lib/mcp/server";

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
});
