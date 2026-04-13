import { describe, it, expect } from "vitest";
import { handleVerification, parseIncomingMessages } from "../../../../workers/whatsapp/src/webhook";

describe("handleVerification", () => {
  it("returns challenge when verify token matches", () => {
    const url = new URL("https://example.com/webhook?hub.mode=subscribe&hub.verify_token=my_token&hub.challenge=test_challenge");
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(200);
  });

  it("returns 403 when verify token does not match", () => {
    const url = new URL("https://example.com/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge");
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(403);
  });

  it("returns 400 when mode is not subscribe", () => {
    const url = new URL("https://example.com/webhook?hub.mode=unsubscribe&hub.verify_token=my_token&hub.challenge=test_challenge");
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(400);
  });
});

describe("parseIncomingMessages", () => {
  it("extracts text messages from webhook payload", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            contacts: [{ profile: { name: "John" }, wa_id: "2250700000000" }],
            messages: [{
              from: "2250700000000",
              id: "wamid.abc",
              timestamp: "1234567890",
              type: "text" as const,
              text: { body: "Bonjour" },
            }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      from: "2250700000000",
      messageId: "wamid.abc",
      text: "Bonjour",
      contactName: "John",
      phoneNumberId: "phone_id",
    });
  });

  it("returns empty array for status updates (no messages)", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            statuses: [{ id: "wamid.abc", status: "delivered" as const, timestamp: "123", recipient_id: "456" }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(0);
  });

  it("skips non-text messages and returns empty", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            contacts: [{ profile: { name: "John" }, wa_id: "2250700000000" }],
            messages: [{
              from: "2250700000000",
              id: "wamid.abc",
              timestamp: "1234567890",
              type: "image" as const,
            }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(0);
  });
});
