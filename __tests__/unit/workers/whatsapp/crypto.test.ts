import { describe, it, expect } from "vitest";
import { verifySignature } from "../../../../workers/whatsapp/src/crypto";

describe("verifySignature", () => {
  const APP_SECRET = "test_app_secret";

  it("returns true for a valid signature", async () => {
    const body = '{"test":"data"}';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `sha256=${hex}`;

    const result = await verifySignature(body, header, APP_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    const result = await verifySignature('{"test":"data"}', "sha256=invalid", APP_SECRET);
    expect(result).toBe(false);
  });

  it("returns false for missing signature header", async () => {
    const result = await verifySignature('{"test":"data"}', "", APP_SECRET);
    expect(result).toBe(false);
  });
});
