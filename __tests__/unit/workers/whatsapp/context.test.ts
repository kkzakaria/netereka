import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadContext, saveContext } from "../../../../workers/whatsapp/src/context";
import type { ConversationContext } from "../../../../workers/whatsapp/src/types";

function createMockKV() {
  return {
    get: vi.fn(),
    put: vi.fn(),
  };
}

describe("loadContext", () => {
  let mockKv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKv = createMockKV();
  });

  it("returns stored context if it exists", async () => {
    const stored: ConversationContext = {
      messages: [{ role: "user", content: "Bonjour" }],
      last_activity: "2026-04-13T10:00:00Z",
    };
    mockKv.get.mockResolvedValueOnce(JSON.stringify(stored));

    const ctx = await loadContext(mockKv as unknown as KVNamespace, "2250700000000");

    expect(ctx).toEqual(stored);
    expect(mockKv.get).toHaveBeenCalledWith("wa:conv:2250700000000");
  });

  it("returns empty context if nothing stored", async () => {
    mockKv.get.mockResolvedValueOnce(null);

    const ctx = await loadContext(mockKv as unknown as KVNamespace, "2250700000000");

    expect(ctx).toEqual({ messages: [], last_activity: expect.any(String) });
  });
});

describe("saveContext", () => {
  let mockKv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKv = createMockKV();
  });

  it("saves context with 24h TTL", async () => {
    const ctx: ConversationContext = {
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Bienvenue!" },
      ],
      last_activity: "2026-04-13T10:00:00Z",
    };

    await saveContext(mockKv as unknown as KVNamespace, "2250700000000", ctx);

    expect(mockKv.put).toHaveBeenCalledWith(
      "wa:conv:2250700000000",
      JSON.stringify(ctx),
      { expirationTtl: 86400 }
    );
  });

  it("trims messages to last 20", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
    }));
    const ctx: ConversationContext = {
      messages,
      last_activity: "2026-04-13T10:00:00Z",
    };

    await saveContext(mockKv as unknown as KVNamespace, "2250700000000", ctx);

    const savedArg = JSON.parse(mockKv.put.mock.calls[0][1] as string) as ConversationContext;
    expect(savedArg.messages).toHaveLength(20);
    expect(savedArg.messages[0].content).toBe("Message 5");
  });
});
