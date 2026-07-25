import { describe, it, expect } from "vitest";
import {
  errorCodeMessages,
  getOAuthCallbackErrorMessage,
  lookupMessage,
} from "@/lib/auth/sign-in-errors";

describe("errorCodeMessages — EMAIL_NOT_VERIFIED", () => {
  it("maps EMAIL_NOT_VERIFIED to an actionable French message", () => {
    expect(errorCodeMessages.EMAIL_NOT_VERIFIED).toBeDefined();
    expect(errorCodeMessages.EMAIL_NOT_VERIFIED).toMatch(/vérifi/i);
  });
});

describe("getOAuthCallbackErrorMessage", () => {
  it("maps account_not_linked to a message that does not promise account linking", () => {
    const message = getOAuthCallbackErrorMessage("account_not_linked");
    expect(message).toBeDefined();
    expect(message).toMatch(/mot de passe/i);
    // Must not promise a linking flow that does not exist client-side.
    expect(message).not.toMatch(/lier/i);
  });

  it("falls back to a generic message for an unknown error code", () => {
    const message = getOAuthCallbackErrorMessage("some_unmapped_future_code");
    expect(message).toBe("Une erreur est survenue. Veuillez réessayer.");
  });

  it("returns null when there is no error code (nothing to display)", () => {
    expect(getOAuthCallbackErrorMessage(null)).toBeNull();
  });

  // The `error` query param is attacker-controlled. A plain map[key] lookup
  // resolves inherited keys to Object.prototype members, returning a function
  // instead of a string. That function reached a useState initializer on the
  // sign-in page and broke its render.
  it.each(["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"])(
    "returns the generic message, not a prototype member, for %s",
    (key) => {
      const message = getOAuthCallbackErrorMessage(key);
      expect(typeof message).toBe("string");
      expect(message).toBe("Une erreur est survenue. Veuillez réessayer.");
    }
  );
});

describe("lookupMessage", () => {
  const map: Record<string, string> = { known: "connu" };

  it("returns the mapped value for an own key", () => {
    expect(lookupMessage(map, "known")).toBe("connu");
  });

  it.each(["toString", "constructor", "valueOf", "__proto__"])(
    "returns undefined for the inherited key %s",
    (key) => {
      expect(lookupMessage(map, key)).toBeUndefined();
    }
  );

  it("returns undefined for null, undefined and the empty string", () => {
    expect(lookupMessage(map, null)).toBeUndefined();
    expect(lookupMessage(map, undefined)).toBeUndefined();
    expect(lookupMessage(map, "")).toBeUndefined();
  });
});
