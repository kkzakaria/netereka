import { describe, it, expect } from "vitest";
import { getOAuthQuery } from "@/lib/auth/oauth-resume";

const SIGNED =
  "client_id=c1&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Fcb&response_type=code&state=s1" +
  "&code_challenge=abc&code_challenge_method=S256&exp=1790721792&ba_iat=1&sig=abc%3D";

describe("getOAuthQuery", () => {
  it("retourne null sans paramètres OAuth", () => {
    expect(getOAuthQuery(new URLSearchParams(""))).toBeNull();
    expect(getOAuthQuery(new URLSearchParams("redirect=/dashboard"))).toBeNull();
  });

  it("exige client_id, redirect_uri, response_type, exp et sig", () => {
    expect(getOAuthQuery(new URLSearchParams("client_id=c&redirect_uri=http://x&response_type=code"))).toBeNull();
    expect(getOAuthQuery(new URLSearchParams("client_id=c&redirect_uri=http://x&exp=1&sig=s"))).toBeNull();
  });

  it("refuse une requête non signée (l'ancien format /mcp/authorize sans sig)", () => {
    expect(getOAuthQuery(new URLSearchParams("client_id=c&redirect_uri=http://x&response_type=code&exp=1"))).toBeNull();
  });

  it("renvoie la requête signée intacte, prête pour oauth_query", () => {
    const params = new URLSearchParams(SIGNED);
    expect(getOAuthQuery(params)).toBe(params.toString());
  });

  it("conserve les paramètres répétés (ba_param) que la signature couvre", () => {
    const params = new URLSearchParams(`${SIGNED}&ba_param=exp&ba_param=client_id`);
    expect(getOAuthQuery(params)?.match(/ba_param=/g)).toHaveLength(2);
  });
});
