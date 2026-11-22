import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));

import { GET } from "@/app/api/saison/apercu/route";

const demander = (chemin: string) => GET(new NextRequest(`https://netereka.ci${chemin}`));

describe("GET /api/saison/apercu", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.requireAdmin.mockResolvedValue({ user: { role: "admin" } });
  });

  it("refuse un non-admin sans poser de cookie", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(demander("/api/saison/apercu")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("pose le cookie d'aperçu et renvoie vers l'accueil", async () => {
    const reponse = await demander("/api/saison/apercu");
    expect(reponse.status).toBe(307);
    expect(reponse.headers.get("location")).toBe("https://netereka.ci/");
    const cookie = reponse.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("netereka_apercu_saison=1");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=86400");
  });

  it("retire le cookie avec ?desactiver=1", async () => {
    const reponse = await demander("/api/saison/apercu?desactiver=1");
    const cookie = reponse.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("netereka_apercu_saison=");
    expect(cookie).not.toContain("netereka_apercu_saison=1");
    expect(cookie).toContain("Max-Age=0");
  });
});
