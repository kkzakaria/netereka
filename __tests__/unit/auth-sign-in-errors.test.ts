import { describe, it, expect } from "vitest";
import { errorCodeMessages, getOAuthCallbackErrorMessage } from "@/lib/auth/sign-in-errors";

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
});
