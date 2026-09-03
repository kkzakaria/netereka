import { describe, it, expect } from "vitest";
import { getOAuthResumeUrl } from "@/lib/auth/oauth-resume";

describe("getOAuthResumeUrl", () => {
  it("retourne null sans paramètres OAuth", () => {
    expect(getOAuthResumeUrl(new URLSearchParams(""))).toBeNull();
    expect(getOAuthResumeUrl(new URLSearchParams("redirect=/dashboard"))).toBeNull();
  });

  it("exige client_id, redirect_uri et response_type", () => {
    expect(getOAuthResumeUrl(new URLSearchParams("client_id=c&redirect_uri=http://x"))).toBeNull();
  });

  it("reconstruit l'URL d'autorisation avec la query intacte", () => {
    const params = new URLSearchParams(
      "client_id=c1&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Fcb&response_type=code&state=s1&code_challenge=abc&code_challenge_method=S256",
    );
    expect(getOAuthResumeUrl(params)).toBe(`/api/auth/mcp/authorize?${params.toString()}`);
  });
});
