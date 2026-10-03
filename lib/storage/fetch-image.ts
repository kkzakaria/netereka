import { nanoid } from "nanoid";
import { uploadToR2 } from "@/lib/storage/images";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

/** Exporté : `lib/ai/image-generation.ts` doit valider le type de l'image
 *  SOURCE d'une édition avant de l'envoyer à xAI, et dupliquer cette liste
 *  ferait exactement ce que ce dépôt a déjà payé ailleurs — deux sources pour
 *  une même vérité, qui divergent au premier ajout de format. */
export const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * PAS d'`image/avif`, et c'est le correctif d'un défaut vu en production le
 * 2026-10-02 : trois images d'une fiche publiée ne s'affichaient pas, sur
 * `ERROR 9520: Original image has unsupported format`.
 *
 * La vitrine sert toute image par `/cdn-cgi/image/…`, et Cloudflare ne lit
 * l'AVIF EN ENTRÉE que sur un plan Enterprise (documentation Images, « Supported
 * formats → Input formats », l'astérisque sur AVIF). Ce compte n'y est pas.
 * Stocker un AVIF revient donc à stocker une image que la boutique ne peut pas
 * rendre — et rien ne le signalait : le téléversement réussissait, la fiche se
 * publiait, et le défaut n'apparaissait qu'à l'œil d'un visiteur.
 *
 * Un AVIF est désormais refusé par `bad_content_type`, un échec typé qui dit au
 * modèle de chercher une autre source. Le refuser à l'entrée vaut mieux que de
 * le convertir : convertir demanderait un décodeur AVIF dans le Worker, pour un
 * format dont aucune source ne dépend — toutes servent du JPEG ou du PNG dès
 * qu'on cesse de leur demander autre chose (voir FETCH_HEADERS).
 *
 * À rouvrir si ce compte passe en Enterprise, ou si la vitrine cesse de passer
 * par le redimensionneur. Pas avant.
 */

/**
 * Extension de fichier pour un type MIME accepté. EXPORTÉE pour la même raison
 * que `ALLOWED_IMAGE_TYPES` : le téléversement d'administration
 * (`actions/admin/images.ts`) en a besoin, et la dupliquer y produirait deux
 * sources pour une même vérité. Il la lit plutôt que le nom du fichier déposé —
 * un « photo.avif » renommé « photo.png » donnerait sinon une clé .png portant
 * des octets AVIF.
 */
export const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

/**
 * Type MIME déduit de l'extension d'une clé R2, ou `null`.
 *
 * Secours pour un objet R2 sans `httpMetadata.contentType` : nos propres
 * téléversements en posent toujours un (`uploadToR2`), mais un objet plus
 * ancien ou importé à la main peut ne pas en avoir. Dérivé de `EXT_BY_TYPE`
 * pour que l'ajout d'un format ne se fasse qu'à un endroit.
 */
export function imageTypeFromKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return Object.entries(EXT_BY_TYPE).find(([, e]) => e === ext)?.[0] ?? null;
}

export type FetchImageResult =
  | { ok: true; key: string; contentType: string; size: number }
  | {
      ok: false;
      reason: "ssrf" | "bad_status" | "bad_content_type" | "too_large" | "timeout" | "fetch_failed" | "upload_failed";
      // HTTP status surfaced for `bad_status` so the diagnostic log can
      // distinguish 403 (anti-bot, may need more headers) from 404 (URL
      // hallucinated by the model, fix is upstream in the prompt).
      status?: number;
    };

/**
 * Rejects URLs that could hit internal networks. DNS lookup is not available
 * inside Workers, so we rely on host-based heuristics: literal IP in private
 * ranges, or common internal hostnames. Any DNS name resolves to whatever the
 * Cloudflare edge resolves it to — this is a best-effort guard, not absolute.
 */
/**
 * Un dernier label entièrement numérique suffit à ce que `inet_aton` interprète
 * TOUT le nom comme une adresse IPv4 : `2130706433`, `0177.0.0.1`, `127.1` et
 * `0x7f.0.0.1` désignent tous 127.0.0.1. On n'accepte donc un tel nom que sous
 * sa forme canonique — quatre octets décimaux non rembourrés — avant de le
 * soumettre aux contrôles de plage ; toute autre écriture est rejetée.
 */
function isNumericLabel(label: string): boolean {
  return /^(\d+|0x[0-9a-f]+)$/.test(label);
}

function isPrivateV4(a: number, b: number): boolean {
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Une adresse IPv6 publique commence par 2 ou 3. Tout ce qui débute par `::`
 * appartient à l'espace non spécifié / bouclage / IPv4 mappée — `[::]` et
 * `[::ffff:127.0.0.1]` atteignent la machine locale — donc on le rejette en
 * bloc plutôt que d'énumérer les formes.
 */
function isBlockedV6(inner: string): boolean {
  return (
    inner.startsWith("::") ||
    inner.startsWith("fc") ||
    inner.startsWith("fd") ||
    inner.startsWith("fe80:")
  );
}

export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "metadata.google.internal") return true;

  if (h.startsWith("[") && h.endsWith("]")) return isBlockedV6(h.slice(1, -1));

  const labels = h.split(".");
  if (!isNumericLabel(labels[labels.length - 1])) return false;

  // Le nom sera résolu comme une IPv4 : il doit être canonique pour être évalué.
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return true;
  const octets = v4.slice(1, 5);
  if (octets.some((o) => o.length > 1 && o.startsWith("0"))) return true; // rembourrage → octal
  if (octets.some((o) => Number(o) > 255)) return true;
  return isPrivateV4(Number(octets[0]), Number(octets[1]));
}


const MAX_REDIRECTS = 3;

/**
 * Browser-like request headers. Many image CDNs (Apple, Samsung, news sites
 * Claude cites) gate on User-Agent and 403 Cloudflare Workers' default UA.
 * A realistic Chrome UA + standard image Accept dramatically improves the
 * fetch success rate without changing semantics for hosts that don't care.
 *
 * `image/avif` RETIRÉ de l'Accept le 2026-10-02. C'est cette ligne qui a cassé
 * trois images en production : l'en-tête annonçait l'AVIF en premier choix, et
 * honor.com — comme tout CDN qui négocie le contenu — a servi de l'AVIF là où
 * l'URL demandée était un `.png`. On stockait donc un format que le
 * redimensionneur de la vitrine ne sait pas lire sur ce plan.
 *
 * La leçon vaut d'être écrite : cet en-tête a été ajouté pour FIABILISER la
 * récupération, et il y est parvenu — en cassant l'affichage, sans qu'aucun
 * test ni aucune erreur ne le signale. Demander un format qu'on ne sait pas
 * servir est une contradiction qui ne se voit qu'à l'œil, chez un visiteur.
 *
 * WebP reste demandé : le redimensionneur le lit en entrée sur tous les plans.
 */
const FETCH_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "image/webp,image/apng,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
};

/**
 * Follow HTTP redirects manually so each Location target passes the SSRF host check
 * before we issue the next request. `redirect: "follow"` would let a public URL
 * bounce to a private IP and bypass the initial hostname validation.
 */
async function fetchWithSsrfSafeRedirects(
  initialUrl: URL,
  signal: AbortSignal,
  accept: string = FETCH_HEADERS.accept,
): Promise<{ ok: true; resp: Response } | { ok: false; reason: "ssrf" | "fetch_failed" }> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const resp = await fetch(current.toString(), {
      signal,
      redirect: "manual",
      headers: { ...FETCH_HEADERS, accept },
    });
    const status = resp.status;
    if (status < 300 || status >= 400) return { ok: true, resp };

    const location = resp.headers.get("location");
    if (!location) return { ok: true, resp }; // 3xx without Location — treat as-is (caller will see bad_status)
    let next: URL;
    try { next = new URL(location, current); } catch { return { ok: false, reason: "fetch_failed" }; }
    if (next.protocol !== "http:" && next.protocol !== "https:") return { ok: false, reason: "ssrf" };
    if (isBlockedHost(next.hostname)) return { ok: false, reason: "ssrf" };
    current = next;
  }
  return { ok: false, reason: "fetch_failed" }; // redirect loop / cap exceeded
}

export async function fetchAndUploadImage(
  draftId: string,
  url: string,
): Promise<FetchImageResult> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, reason: "ssrf" }; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, reason: "ssrf" };
  if (isBlockedHost(parsed.hostname)) return { ok: false, reason: "ssrf" };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    let resp: Response;
    try {
      const r = await fetchWithSsrfSafeRedirects(parsed, ac.signal);
      if (!r.ok) return { ok: false, reason: r.reason };
      resp = r.resp;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
      return { ok: false, reason: "fetch_failed" };
    }

    if (!resp.ok) return { ok: false, reason: "bad_status", status: resp.status };

    let ct = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

    // Un AVIF servi malgré un `Accept` qui ne le demande pas : on redemande en
    // n'annonçant QUE des formats anciens. C'est l'origine qui convertit —
    // elle a l'original et le fait gratuitement, là où convertir nous-mêmes
    // exigerait un décodeur AVIF en WebAssembly dans le Worker.
    //
    // L'Images binding de Cloudflare ne nous sauverait pas : `.input()` lit la
    // même liste de formats d'entrée, où l'AVIF est réservé au plan Enterprise.
    // Il n'existe donc aucune conversion côté Cloudflare sur ce compte.
    //
    // Un seul second essai, et seulement pour ce cas : un `Accept` restreint
    // dès le premier appel ferait échouer des hôtes qui exigent un en-tête de
    // navigateur plausible, ce que FETCH_HEADERS existe précisément pour imiter.
    if (ct === "image/avif") {
      const retry = await fetchWithSsrfSafeRedirects(parsed, ac.signal, "image/jpeg,image/png;q=0.9,*/*;q=0.1");
      if (retry.ok && retry.resp.ok) {
        const retryCt = (retry.resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (ALLOWED_IMAGE_TYPES.has(retryCt)) {
          resp = retry.resp;
          ct = retryCt;
        }
      }
    }

    if (!ALLOWED_IMAGE_TYPES.has(ct)) return { ok: false, reason: "bad_content_type" };

    const reader = resp.body?.getReader();
    if (!reader) return { ok: false, reason: "fetch_failed" };

    // Keep the timeout active during body streaming — an oversized or slow image
    // can legitimately trip the abort mid-stream; reader.read() will reject with
    // AbortError, caught below and normalized to a structured result.
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > IMAGE_MAX_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return { ok: false, reason: "too_large" };
        }
        chunks.push(value);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
      return { ok: false, reason: "fetch_failed" };
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buffer.set(c, offset); offset += c.byteLength; }

    const ext = EXT_BY_TYPE[ct] ?? "jpg";
    const key = `products/${draftId}/${nanoid()}.${ext}`;
    const file = new File([buffer], key, { type: ct });
    try {
      await uploadToR2(file, key);
    } catch (err) {
      console.error("[fetch-image] R2 upload failed for key", key, err);
      return { ok: false, reason: "upload_failed" };
    }

    return { ok: true, key, contentType: ct, size: total };
  } finally {
    clearTimeout(timer);
  }
}
