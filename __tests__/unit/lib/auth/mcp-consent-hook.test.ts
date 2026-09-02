import { describe, it, expect } from "vitest";
import { forceConsentQuery, MCP_AUTHORIZE_PATH } from "@/lib/auth/mcp-consent-hook";

describe("forceConsentQuery", () => {
  it("ignore les autres endpoints", () => {
    expect(forceConsentQuery("/sign-in/email", { prompt: "none" })).toBeUndefined();
    expect(forceConsentQuery(undefined, { prompt: "none" })).toBeUndefined();
  });

  it("force prompt=consent quand le client n'envoie rien", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { client_id: "c1" }))
      .toEqual({ client_id: "c1", prompt: "consent" });
  });

  it("écrase prompt=none et prompt=login", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { prompt: "none" })?.prompt).toBe("consent");
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { prompt: "login" })?.prompt).toBe("consent");
  });

  it("tolère une query absente", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, undefined)).toEqual({ prompt: "consent" });
  });
});
