import { describe, it, expect, vi, beforeEach } from "vitest";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));

import { createD1Mock } from "../../../helpers/d1-mock";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";

// select({ id, name, role, banned, banExpires }) → positional row
const row = (role: string, banned = 0, banExpires: string | null = null) => [["u1", "Admin", role, banned, banExpires]];

beforeEach(() => { d1.current = createD1Mock(); });

describe("buildMcpContext", () => {
  it("accepte admin et super_admin", async () => {
    d1.current!.raw.mockResolvedValue(row("admin"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toEqual({
      user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c1",
    });
    d1.current!.raw.mockResolvedValue(row("super_admin"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toMatchObject({ user: { role: "super_admin" } });
  });

  it("refuse customer et agent", async () => {
    d1.current!.raw.mockResolvedValue(row("customer"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue(row("agent"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
  });

  it("refuse un admin banni, accepte un ban expiré", async () => {
    d1.current!.raw.mockResolvedValue(row("admin", 1, null));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue(row("admin", 1, "2000-01-01T00:00:00.000Z"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toBeDefined();
  });

  it("refuse un jeton sans utilisateur ou un utilisateur supprimé", async () => {
    await expect(buildMcpContext({ userId: null, clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue([]);
    await expect(buildMcpContext({ userId: "gone", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
  });
});
