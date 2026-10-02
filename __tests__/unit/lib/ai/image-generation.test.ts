import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getEnv: vi.fn() }));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));

import {
  SOURCE_MAX_BYTES,
  XAI_IMAGE_MODEL,
  editProductImage,
  encodeSourceImage,
} from "@/lib/ai/image-generation";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe("encodeSourceImage", () => {
  it("rend une data URI base64 portant le type de l'objet R2", () => {
    const r = encodeSourceImage(PNG, "image/png", "products/p1/abc.png");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.contentType).toBe("image/png");
      expect(r.dataUri.startsWith("data:image/png;base64,")).toBe(true);
      expect(r.dataUri.slice("data:image/png;base64,".length)).toBe(Buffer.from(PNG).toString("base64"));
      expect(r.size).toBe(4);
    }
  });

  it("déduit le type de l'extension quand R2 ne porte pas de contentType", () => {
    const r = encodeSourceImage(PNG, null, "products/p1/abc.webp");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contentType).toBe("image/webp");
  });

  it("refuse un type non pris en charge plutôt que de l'envoyer à xAI", () => {
    const r = encodeSourceImage(PNG, "image/gif", "products/p1/abc.gif");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("bad_content_type");
      expect(r.detail).toContain("image/gif");
    }
  });

  it("refuse un type indéterminable (ni contentType ni extension connue)", () => {
    const r = encodeSourceImage(PNG, null, "products/p1/abc.bin");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  it("refuse au-delà du plafond, AVANT de construire le corps JSON", () => {
    const big = new Uint8Array(SOURCE_MAX_BYTES + 1);
    const r = encodeSourceImage(big, "image/jpeg", "products/p1/a.jpg");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("too_large");
      expect(r.detail).toMatch(/Ko/);
    }
  });

  it("encode sans RangeError une image de plusieurs mégaoctets (base64 par tranches)", () => {
    const big = new Uint8Array(SOURCE_MAX_BYTES);
    big.fill(0x41);
    const r = encodeSourceImage(big, "image/jpeg", "products/p1/a.jpg");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dataUri.length).toBeGreaterThan(SOURCE_MAX_BYTES);
  });
});

describe("editProductImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k" });
  });

  it("no_api_key quand XAI_API_KEY est absente, SANS appeler xAI", async () => {
    mocks.getEnv.mockResolvedValue({});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const r = await editProductImage({ sourceImage: "data:image/png;base64,AA", prompt: "un décor" });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_api_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("appelle /v1/images/edits en mode édition : modèle, image source, response_format=url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ url: "https://xai/out.png" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await editProductImage({ sourceImage: "data:image/png;base64,AA", prompt: "sur un bureau en bois" });

    expect(r).toEqual({ ok: true, url: "https://xai/out.png" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // ÉDITION, pas génération libre : le chemin /edits est ce qui garantit
    // que la photo réelle du produit reste la base du visuel.
    expect(url).toBe("https://api.x.ai/v1/images/edits");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer xai-k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(XAI_IMAGE_MODEL);
    expect(body.prompt).toBe("sur un bureau en bois");
    expect(body.image).toEqual({ type: "image_url", url: "data:image/png;base64,AA" });
    expect(body.n).toBe(1);
    // L'URL est demandée explicitement : le base64 contournerait fetch-image.ts.
    expect(body.response_format).toBe("url");
    // Le palier facturé est un CHOIX : `resolution` est le seul levier de
    // facturation que l'OpenAPI expose sur cet endpoint (`quality` n'y est
    // pas un champ de requête), et son défaut serait hérité sans ça.
    expect(body.resolution).toBe("1k");
  });

  it("auth_failed sur 401 et 403", async () => {
    for (const status of [401, 403]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("auth_failed");
    }
  });

  /**
   * L'OpenAPI ne documente, pour /v1/images/edits, que 200, 400 et 422 — et
   * son libellé du 400 est « The request is invalid or an invalid API key is
   * provided ». Une clé révoquée arrive donc par ce chemin, pas par le
   * 401/403. Sans reclassement, elle se lisait « xAI a refusé la demande » en
   * validation_error : le modèle aurait réécrit son invite indéfiniment
   * pendant que le secret était le problème.
   */
  it("un 400 dont le corps parle de la clé devient auth_failed, pas rejected", async () => {
    for (const body of [
      '{"error":"Incorrect API key provided"}',
      '{"error":"unauthorized"}',
      '{"error":"authentication failed"}',
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 400 })));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("auth_failed");
    }
  });

  /**
   * Les corps que la revue a rejoués et qui sortaient en `auth_failed` : ce
   * sont des refus de POLITIQUE DE CONTENU, pas d'authentification. « forbidden
   * content », « unauthorized use of a likeness » (droit à l'image), « marque
   * déposée » — le vocabulaire d'un modèle d'images qui refuse. Les classer en
   * clé détruisait le détail qui disait au modèle quoi corriger, et envoyait
   * l'administrateur renouveler un secret intact.
   *
   * Le dernier cas est le plus net : xAI peut renvoyer l'invite fautive dans
   * son corps, et cette invite est ÉCRITE PAR LE MODÈLE — qui pourrait donc
   * orienter sa propre classification. Il ne le peut plus par ces mots-là.
   */
  it("un refus de contenu ne se déguise pas en problème de clé", async () => {
    for (const body of [
      '{"error":"Forbidden content: the prompt requests a depiction that violates our image policy"}',
      '{"error":{"message":"This request is forbidden by the usage policy"}}',
      '{"error":"Unauthorized use of a public figure likeness is not permitted"}',
      '{"error":"unauthorised depiction of a trademarked logo"}',
      '{"error":"Invalid prompt: \'un carton marqué FORBIDDEN\'"}',
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 400 })));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe("rejected");
        expect(r.detail).toBeTruthy(); // le détail est ce qui rend le refus actionnable
      }
    }
  });

  /**
   * Un classement à tort doit rester rattrapable : `auth_failed` SANS détail
   * détruisait la seule information actionnable du lot, ce qui rendait
   * l'heuristique irréversible. Avec le détail, celui qui lit tranche.
   */
  it("auth_failed porte le détail de xAI, pour qu'un classement à tort se voie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response('{"error":"Incorrect API key provided: sk-xx…"}', { status: 400 }),
    ));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("auth_failed");
      expect(r.detail).toContain("Incorrect API key");
    }
  });

  /**
   * Seul le 400 couvre la clé invalide dans l'OpenAPI ; le 422 documente des
   * « missing fields ». Le corps doit ici satisfaire la regex d'authentification
   * — sinon le test passerait par le texte et ne garderait pas la borne de
   * statut. C'est le piège : mon premier essai utilisait « credential », que la
   * regex resserrée ne reconnaît plus, et il restait vert sans la borne.
   */
  it("un 422 nommant la clé reste rejected : le reclassement est borné au 400", async () => {
    const body = '{"error":"missing field: api_key"}';
    expect(/api[ _-]?key/i.test(body)).toBe(true); // le corps déclencherait bien l'heuristique
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 422 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rejected");
  });

  it("un 400 qui parle de l'invite reste rejected, avec son détail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response('{"error":"prompt violates content policy"}', { status: 400 }),
    ));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("rejected");
      expect(r.detail).toContain("content policy");
    }
  });

  it("rate_limited sur 429 — distinct d'un 4xx de refus", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rate_limited");
  });

  it("rejected sur 400, avec le détail de xAI borné à 200 caractères", async () => {
    const long = "x".repeat(500);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(long, { status: 400 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("rejected");
      expect(r.detail!.length).toBeLessThanOrEqual(201);
      expect(r.detail!.endsWith("…")).toBe(true);
    }
  });

  it("rejected porte au moins le statut quand le corps est vide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 422 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toBe("HTTP 422");
  });

  it("upstream_error sur 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("upstream_error");
  });

  it("parse_failed sur un 200 non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("parse_failed");
  });

  // Le cœur du § 4.2 : pas de second chemin de téléversement vers R2.
  it("b64_not_supported quand xAI répond en base64 — PAS de décodage ici", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [{ b64_json: "QUJD" }] })));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("b64_not_supported");
  });

  it("no_image quand data est vide ou sans url exploitable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const body of [{ data: [] }, {}, { data: [{ url: "" }] }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body)));
      const r = await editProductImage({ sourceImage: "d", prompt: "p" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("no_image");
    }
  });

  it("timeout quand la requête est interrompue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    }));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timeout");
  });

  it("fetch_failed sur une panne réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const r = await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("fetch_failed");
  });

  it("ne télécharge pas le résultat : il rend l'URL, un seul appel sortant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ url: "https://xai/out.png" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await editProductImage({ sourceImage: "d", prompt: "p" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
