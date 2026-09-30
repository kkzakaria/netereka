import { describe, it, expect, vi, afterAll } from "vitest";
import { serveJwksLocally } from "@/lib/mcp/local-jwks";

const network = vi.fn(async () => new Response("réseau"));
vi.stubGlobal("fetch", network);

afterAll(() => vi.unstubAllGlobals());

describe("serveJwksLocally", () => {
  const URL_JWKS = "https://netereka.ci/api/auth/jwks";

  it("répond à l'URL exacte depuis la source, sans réseau", async () => {
    serveJwksLocally(URL_JWKS, async () => ({ keys: [{ kid: "k1" }] }));
    const res = await fetch(URL_JWKS, { headers: { Accept: "application/json" }, redirect: "manual" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ keys: [{ kid: "k1" }] });
    expect(network).not.toHaveBeenCalled();
  });

  it("laisse passer toute autre URL, et les méthodes autres que GET", async () => {
    await fetch("https://netereka.ci/api/auth/other");
    await fetch(URL_JWKS, { method: "POST" });
    await fetch(`${URL_JWKS}?x=1`);
    expect(network).toHaveBeenCalledTimes(3);
  });

  it("n'empile pas l'enveloppe quand on redéclare une source", async () => {
    const before = globalThis.fetch;
    serveJwksLocally(URL_JWKS, async () => ({ keys: [] }));
    expect(globalThis.fetch).toBe(before);
    expect(await (await fetch(URL_JWKS)).json()).toEqual({ keys: [] });
  });

  it("répond 500 (sans fuite) si la source échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    serveJwksLocally(URL_JWKS, async () => {
      throw new Error("secret interne");
    });
    const res = await fetch(URL_JWKS);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret");
  });
});
