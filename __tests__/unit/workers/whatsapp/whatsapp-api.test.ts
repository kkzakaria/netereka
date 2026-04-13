import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppAPI } from "../../../../workers/whatsapp/src/whatsapp-api";

describe("WhatsAppAPI", () => {
  let api: WhatsAppAPI;

  beforeEach(() => {
    api = new WhatsAppAPI("test_phone_id", "test_access_token");
    global.fetch = vi.fn();
  });

  it("sends a text message with correct payload", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    const result = await api.sendText("+2250700000000", "Hello!");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/test_phone_id/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_access_token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "+2250700000000",
          type: "text",
          text: { body: "Hello!" },
        }),
      })
    );
    expect(result).toEqual({ success: true, messageId: "wamid.123" });
  });

  it("returns error on API failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 })
    );

    const result = await api.sendText("+2250700000000", "Hello!");
    expect(result).toEqual({ success: false, error: "Invalid token" });
  });

  it("marks message as read", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await api.markAsRead("wamid.123");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/test_phone_id/messages",
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: "wamid.123",
        }),
      })
    );
  });
});
