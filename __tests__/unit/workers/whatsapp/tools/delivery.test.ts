import { describe, it, expect, vi } from "vitest";
import { getDeliveryZones } from "../../../../../workers/whatsapp/src/tools/delivery";
import type { ToolContext, WhatsAppSession, Env } from "../../../../../workers/whatsapp/src/types";

describe("getDeliveryZones", () => {
  it("returns active delivery zones with fees", async () => {
    const mockStatement = { bind: vi.fn().mockReturnThis(), first: vi.fn(), run: vi.fn(), all: vi.fn() };
    const mockDb = { prepare: vi.fn().mockReturnValue(mockStatement) };
    const ctx = { db: mockDb as unknown as D1Database, session: {} as WhatsAppSession, env: {} as Env } as ToolContext;

    mockStatement.all.mockResolvedValueOnce({
      results: [
        { id: "z1", name: "Cocody", commune: "Cocody", fee: 2000, estimated_hours: 24 },
        { id: "z2", name: "Plateau", commune: "Plateau", fee: 1500, estimated_hours: 12 },
      ],
    });

    const result = await getDeliveryZones(ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ name: "Cocody", fee: 2000 });
  });
});
