import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchClientMetadataResource } from "@/lib/auth/cimd-fetch";

describe("fetchClientMetadataResource", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("récupère un document HTTPS public sans jamais suivre les redirections", async () => {
    const res = await fetchClientMetadataResource("https://client.example/cimd.json", {
      headers: { Accept: "application/json" },
    });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe("https://client.example/cimd.json");
    expect(init.redirect).toBe("manual");
    expect(init.method).toBe("GET");
  });

  it.each([
    ["HTTP clair", "http://client.example/cimd.json"],
    ["port non standard", "https://client.example:8443/cimd.json"],
    ["identifiants dans l'URL", "https://user:pw@client.example/cimd.json"],
    ["loopback", "https://127.0.0.1/cimd.json"],
    ["localhost", "https://localhost/cimd.json"],
    ["réseau privé", "https://10.0.0.5/cimd.json"],
    ["link-local (métadonnées cloud)", "https://169.254.169.254/latest/meta-data"],
    ["IPv6 loopback", "https://[::1]/cimd.json"],
  ])("refuse %s", async (_label, url) => {
    await expect(fetchClientMetadataResource(url)).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepte redirect: \"error\" (ce que demande la bibliothèque) mais force manual", async () => {
    await fetchClientMetadataResource("https://client.example/cimd.json", { redirect: "error" });
    expect((fetchMock.mock.calls[0] as [URL, RequestInit])[1].redirect).toBe("manual");
  });

  it("échoue bruyamment si la bibliothèque passe à redirect: \"follow\"", async () => {
    await expect(
      fetchClientMetadataResource("https://client.example/cimd.json", { redirect: "follow" }),
    ).rejects.toThrow(/redirect/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une méthode autre que GET", async () => {
    await expect(
      fetchClientMetadataResource("https://client.example/cimd.json", { method: "POST" }),
    ).rejects.toThrow(/GET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renvoie une redirection telle quelle : l'appelant la traite comme un échec", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://evil.example/" } }));
    const res = await fetchClientMetadataResource("https://client.example/cimd.json");
    expect(res.status).toBe(302);
  });
});
