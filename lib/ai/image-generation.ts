import { getEnv } from "@/lib/cloudflare/context";
import { ALLOWED_IMAGE_TYPES, IMAGE_MAX_BYTES, imageTypeFromKey } from "@/lib/storage/fetch-image";

/**
 * Client de `grok-imagine-image-2.0` en MODE ÉDITION (xAI).
 *
 * L'édition, et non la génération libre : la source est la photo réelle du
 * produit, déjà en R2. Le modèle compose le décor, l'éclairage, la mise en
 * situation — il ne réinvente pas l'objet. Sur une boutique en paiement à la
 * livraison, un visuel qui ne correspond pas à ce qui arrive se paie en colis
 * refusé à la porte du client.
 *
 * Ce module NE TÉLÉCHARGE PAS le résultat et n'écrit rien : il rend l'URL
 * temporaire qu'xAI héberge, et l'appelant la fait passer par
 * `lib/storage/fetch-image.ts` — garde SSRF, plafond 5 Mo, délai 10 s, durcie
 * contre les formes IPv6 en 2.0.0. C'est le SEUL chemin de téléchargement du
 * dépôt et on n'en ouvre pas un second, « juste pour le résultat de la
 * génération » compris.
 *
 * Corollaire : on demande explicitement `response_format: "url"`. Une réponse
 * en base64 serait un second chemin de téléversement vers R2, sans le
 * contrôle de type ni le plafond de taille — elle est donc refusée par un
 * échec typé (`b64_not_supported`) plutôt que décodée ici.
 *
 * Contrat d'API vérifié sur la documentation xAI (docs.x.ai, 2026-10-01) :
 * POST /v1/images/edits, corps JSON, `image: { type: "image_url", url }` où
 * `url` accepte une URL publique OU une data URI base64, réponse
 * `{ data: [{ url }] }`. NON vérifié par un appel réel : aucune clé xAI
 * n'existe sur ce déploiement (cf. `env.d.ts`).
 */

const XAI_EDITS_ENDPOINT = "https://api.x.ai/v1/images/edits";
export const XAI_IMAGE_MODEL = "grok-imagine-image-2.0";
const DEFAULT_TIMEOUT_MS = 60_000;
/** Longueur maximale du détail d'erreur renvoyé par xAI qu'on relaie. Borné
 *  pour qu'un corps d'erreur bavard ne devienne pas la réponse de l'outil. */
const MAX_DETAIL_CHARS = 200;

/**
 * Plafond de l'image SOURCE, repris de `fetch-image.ts` plutôt que choisi
 * ici : toute image entrée dans R2 par le MCP a déjà franchi ce plafond, et
 * une source plus lourde (téléversée autrement) produirait un corps JSON
 * d'environ 4/3 de sa taille — on refuse avant de le construire, au lieu de
 * laisser xAI répondre une erreur de charge.
 */
export const SOURCE_MAX_BYTES = IMAGE_MAX_BYTES;

export type SourceEncoding =
  | { ok: true; dataUri: string; contentType: string; size: number }
  | { ok: false; reason: "too_large" | "bad_content_type"; detail: string };

/** base64 par tranches : `String.fromCharCode(...bytes)` sur 5 Mo d'un coup
 *  dépasse la limite d'arguments du moteur et lève un RangeError. */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

/**
 * Transforme les octets d'une image R2 en data URI pour le champ `image` de
 * la requête d'édition.
 *
 * On envoie une data URI et non l'URL publique de l'objet : celle-ci dépend
 * de `NEXT_PUBLIC_R2_URL`, une variable de BUILD absente en local, où
 * `getImageUrl` rendrait un chemin relatif qu'xAI ne saurait pas résoudre.
 * Voir aussi `readFromR2` (lib/storage/images.ts).
 */
export function encodeSourceImage(
  bytes: Uint8Array,
  contentType: string | null,
  key: string,
): SourceEncoding {
  const ct = (contentType ?? imageTypeFromKey(key) ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(ct)) {
    return {
      ok: false,
      reason: "bad_content_type",
      detail: ct ? `type « ${ct} » non pris en charge` : "type d'image indéterminé",
    };
  }
  if (bytes.byteLength > SOURCE_MAX_BYTES) {
    return {
      ok: false,
      reason: "too_large",
      detail: `${Math.round(bytes.byteLength / 1024)} Ko, plafond ${Math.round(SOURCE_MAX_BYTES / 1024)} Ko`,
    };
  }
  return {
    ok: true,
    dataUri: `data:${ct};base64,${toBase64(bytes)}`,
    contentType: ct,
    size: bytes.byteLength,
  };
}

export interface ImageEditInput {
  /** Data URI (`data:image/jpeg;base64,…`) ou URL publique de la source. */
  sourceImage: string;
  prompt: string;
}

export type ImageEditResult =
  | { ok: true; url: string }
  | {
      ok: false;
      reason:
        | "no_api_key"
        | "auth_failed"
        | "rate_limited"
        /** 4xx : xAI a refusé la demande (invite modérée, image inexploitable,
         *  charge trop lourde…). `detail` porte ce qu'il en dit, borné. */
        | "rejected"
        | "upstream_error"
        | "parse_failed"
        /** 200, mais aucune URL d'image dans `data` — rien à télécharger. */
        | "no_image"
        /** 200 avec du base64 : refusé, voir le commentaire de tête. */
        | "b64_not_supported"
        | "timeout"
        | "fetch_failed";
      detail?: string;
    };

interface XaiImageItem {
  url?: unknown;
  b64_json?: unknown;
}

function clampDetail(raw: string): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > MAX_DETAIL_CHARS ? `${flat.slice(0, MAX_DETAIL_CHARS)}…` : flat;
}

/**
 * Compose une image autour de `sourceImage` et rend l'URL temporaire du
 * résultat. Lit la clé dans le secret `XAI_API_KEY` : l'appelant n'a rien à
 * passer, et une clé absente est un échec TYPÉ qui nomme le secret — pas une
 * erreur générique, pas un silence, pas un résultat vide.
 */
export async function editProductImage(
  input: ImageEditInput,
  opts: { timeoutMs?: number } = {},
): Promise<ImageEditResult> {
  const env = await getEnv();
  const apiKey = env.XAI_API_KEY ?? null;
  if (!apiKey) return { ok: false, reason: "no_api_key" };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(XAI_EDITS_ENDPOINT, {
      method: "POST",
      signal: ac.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        model: XAI_IMAGE_MODEL,
        prompt: input.prompt,
        image: { type: "image_url", url: input.sourceImage },
        n: 1,
        // Le résultat doit arriver sous forme d'URL : voir le commentaire de
        // tête. Le base64 contournerait fetch-image.ts.
        response_format: "url",
      }),
    });

    if (resp.status === 401 || resp.status === 403) return { ok: false, reason: "auth_failed" };
    if (resp.status === 429) return { ok: false, reason: "rate_limited" };
    if (resp.status >= 400 && resp.status < 500) {
      // Le détail d'un 4xx est la seule information actionnable du lot : il
      // dit si l'invite a été modérée, si l'image source est inexploitable ou
      // si la charge est trop lourde. On le relaie, borné.
      const body = await resp.text().catch(() => "");
      return { ok: false, reason: "rejected", detail: clampDetail(body) || `HTTP ${resp.status}` };
    }
    if (!resp.ok) return { ok: false, reason: "upstream_error" };

    let json: { data?: XaiImageItem[] };
    try {
      json = (await resp.json()) as { data?: XaiImageItem[] };
    } catch {
      return { ok: false, reason: "parse_failed" };
    }

    const first = json?.data?.[0];
    if (first && typeof first.url === "string" && first.url.length > 0) {
      return { ok: true, url: first.url };
    }
    if (first && typeof first.b64_json === "string" && first.b64_json.length > 0) {
      // 200 avec du base64 malgré `response_format: "url"` : on refuse plutôt
      // que d'ouvrir un second chemin de téléversement vers R2, sans contrôle
      // de type ni plafond de taille.
      console.error("[image-generation] xAI a répondu en base64 malgré response_format=url");
      return { ok: false, reason: "b64_not_supported" };
    }
    console.error("[image-generation] xAI 200 sans URL d'image", { keys: Object.keys(json ?? {}) });
    return { ok: false, reason: "no_image" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}
