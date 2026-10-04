import { nanoid } from "nanoid";
import { uploadToR2 } from "@/lib/storage/images";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

/** Exporté : `lib/ai/image-generation.ts` doit valider le type de l'image
 *  SOURCE d'une édition avant de l'envoyer à xAI, et dupliquer cette liste
 *  ferait exactement ce que ce dépôt a déjà payé ailleurs — deux sources pour
 *  une même vérité, qui divergent au premier ajout de format. */
/**
 * Extension de fichier par type d'image accepté. C'est la SEULE table : la
 * liste des types autorisés en est dérivée juste en dessous, si bien que les
 * deux ne peuvent plus diverger — elles l'ont fait assez longtemps pour qu'un
 * `?? "jpg"` passe pour une garde alors qu'il était inatteignable.
 */
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

export const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set(Object.keys(EXT_BY_TYPE));

/** Nombre d'octets de tête suffisant pour reconnaître les quatre formats. */
export const OCTETS_DE_SIGNATURE = 12;

/**
 * Le format RÉEL d'une image, lu dans ses premiers octets.
 *
 * Pourquoi cela existe, alors que le type déclaré est déjà validé : un
 * navigateur déduit `File.type` de l'EXTENSION. Un « photo.avif » renommé
 * « photo.png » arrive donc avec `image/png`, honnêtement, sans que personne
 * ne mente — et la validation du type ne voit rien. Le scénario que nous
 * disions corriger (« une clé .png portant des octets AVIF ») restait donc
 * entier dans le cas COURANT : seul le cas d'un client dont le nom et le type
 * divergent était fermé. Ce sont les octets qui tranchent, pas la déclaration.
 *
 * Rend `null` pour tout ce qui n'est pas l'un des trois formats retenus —
 * y compris un AVIF, reconnu explicitement pour pouvoir le NOMMER dans le
 * refus plutôt que de répondre « format inconnu ».
 */
export function formatDesOctets(octets: Uint8Array): { type: string } | { avif: true } | null {
  const a = (i: number) => octets[i];
  const ascii = (debut: number, mot: string) =>
    [...mot].every((c, i) => a(debut + i) === c.charCodeAt(0));

  if (a(0) === 0xff && a(1) === 0xd8 && a(2) === 0xff) return { type: "image/jpeg" };
  if (a(0) === 0x89 && ascii(1, "PNG")) return { type: "image/png" };
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return { type: "image/webp" };
  // ISO-BMFF : « ftyp » en 4–7, puis la marque en 8–11. `avis` est la
  // séquence d'images, refusée pour la même raison que `avif`.
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return { avif: true };
  return null;
}

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
 * Extension de fichier pour un type d'image ACCEPTÉ.
 *
 * Lève si le type n'est pas dans `ALLOWED_IMAGE_TYPES` : les deux tables ont
 * exactement les mêmes clés, et chaque appelant vérifie l'appartenance juste
 * avant. Un repli `?? "jpg"` y avait l'air d'une garde alors qu'il était
 * inatteignable — et un repli mort qui ressemble à une protection est pire
 * qu'un invariant qui s'annonce. Si cette exception survient un jour, c'est que
 * les deux tables ont divergé.
 */
export function extensionPour(contentType: string): string {
  const ext = EXT_BY_TYPE[contentType.toLowerCase()];
  if (!ext) {
    throw new Error(
      `extensionPour: type « ${contentType} » absent d'EXT_BY_TYPE alors qu'il a passé ALLOWED_IMAGE_TYPES — ` +
      "les deux tables ont divergé.",
    );
  }
  return ext;
}

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

/** Le téléchargement seul : les octets en main, rien d'écrit.
 *  `Uint8Array<ArrayBuffer>` et non `Uint8Array` tout court : le second
 *  autorise un `SharedArrayBuffer`, que `new File([...])` refuse. */
export type FetchBytesResult =
  | { ok: true; bytes: Uint8Array<ArrayBuffer>; contentType: string; size: number }
  | Exclude<FetchImageResult, { ok: true } | { ok: false; reason: "upload_failed" }>;

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
/**
 * En-tête du SECOND essai, quand une origine a servi un AVIF malgré le premier.
 * Il met le JPEG et le PNG en tête, mais garde un joker en dernier recours : une
 * origine qui ignore les facteurs de qualité peut donc encore servir de l'AVIF,
 * et c'est prévu — le contrôle de type qui suit rend alors `bad_content_type`.
 * Un seul second essai, jamais de boucle.
 */
const RETRY_ACCEPT = "image/jpeg,image/png;q=0.9,*/*;q=0.1";

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

/**
 * Télécharge une image et la dépose en R2 sous `products/<id>/`.
 *
 * Conserve la signature historique de ses quatre appelants ; tout le travail
 * est dans `fetchAndUploadImageTo`, qui ne présume pas du préfixe.
 */
export async function fetchAndUploadImage(draftId: string, url: string): Promise<FetchImageResult> {
  return fetchAndUploadImageTo(`products/${draftId}`, url);
}

/**
 * Même téléchargement, préfixe de clé choisi par l'appelant — `banners/<id>`
 * pour une image de bannière, `products/<id>` pour une fiche.
 *
 * Le préfixe vient du CODE, jamais d'une entrée de modèle : `..` ou une barre
 * de tête y écriraient hors de l'arborescence attendue, ou ailleurs dans le
 * bucket. Le contrôle est ici plutôt qu'à l'appel pour qu'un futur appelant ne
 * puisse pas l'oublier.
 */
export async function fetchAndUploadImageTo(
  keyPrefix: string,
  url: string,
): Promise<FetchImageResult> {
  if (!/^[a-z0-9][a-z0-9/_-]*$/i.test(keyPrefix) || keyPrefix.includes("//") || keyPrefix.endsWith("/")) {
    throw new Error(`[fetch-image] préfixe de clé invalide : « ${keyPrefix} »`);
  }

  const got = await fetchImageBytes(url);
  if (!got.ok) return got;

  const ext = extensionPour(got.contentType);
  const key = `${keyPrefix}/${nanoid()}.${ext}`;
  const file = new File([got.bytes], key, { type: got.contentType });
  try {
    await uploadToR2(file, key);
  } catch (err) {
    console.error("[fetch-image] R2 upload failed for key", key, err);
    return { ok: false, reason: "upload_failed" };
  }
  return { ok: true, key, contentType: got.contentType, size: got.size };
}

/**
 * Le téléchargement SEUL : mêmes gardes, rien d'écrit nulle part.
 *
 * Extrait de `fetchAndUploadImageTo` pour `view_image`, qui doit REGARDER une
 * image sans la faire entrer dans le stockage de la boutique. Un second
 * chemin de téléchargement écrit à côté aurait rouvert, pour un outil de
 * lecture, la garde SSRF, le plafond de 5 Mo, le délai de 10 s, la liste des
 * types et le second essai sur AVIF — cinq protections à maintenir en double.
 */
export async function fetchImageBytes(url: string): Promise<FetchBytesResult> {
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
    //
    // DANS LE MÊME try/catch que le premier appel, et ce n'est pas un détail de
    // style : sans lui, une erreur du second essai SORTAIT de cette fonction au
    // lieu d'être normalisée, alors qu'elle rendait jusqu'ici toujours un
    // résultat typé. Le délai et l'AbortController étant PARTAGÉS, une origine
    // lente qui consomme la fenêtre au premier appel fait avorter le second
    // presque aussitôt — le `timeout` typé devenait donc une exception. Ses
    // appelants travaillent en `Promise.all` : un seul rejet aurait perdu tout
    // un lot d'images déjà téléchargées et déjà écrites en R2, et, sur le
    // chemin de la génération, aurait court-circuité l'avertissement
    // « facturée mais non attachée ».
    if (ct === "image/avif") {
      try {
        const retry = await fetchWithSsrfSafeRedirects(parsed, ac.signal, RETRY_ACCEPT);
        if (retry.ok && retry.resp.ok) {
          const retryCt = (retry.resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
          if (ALLOWED_IMAGE_TYPES.has(retryCt)) {
            // Le corps AVIF initial ne sera jamais lu : sous workerd, une
            // réponse non consommée retient la sous-requête.
            await resp.body?.cancel().catch(() => {});
            resp = retry.resp;
            ct = retryCt;
          } else {
            await retry.resp.body?.cancel().catch(() => {});
          }
        } else if (retry.ok) {
          await retry.resp.body?.cancel().catch(() => {});
        } else if (retry.reason === "ssrf") {
          // Une redirection du second essai vers un hôte interne. Retomber en
          // silence sur l'AVIF initial dirait au modèle « mauvais format,
          // cherche ailleurs » là où la cause est une redirection interne : le
          // code `reason` pilote ce que l'outil MCP répond, et ce diagnostic-là
          // ne doit pas se perdre.
          await resp.body?.cancel().catch(() => {});
          return { ok: false, reason: "ssrf" };
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          await resp.body?.cancel().catch(() => {});
          return { ok: false, reason: "timeout" };
        }
        // Toute autre panne du second essai : on garde la réponse AVIF
        // initiale, et le contrôle de type juste en dessous rend
        // `bad_content_type`. Échouer typé, comme avant ce chemin.
      }
    }

    if (!ALLOWED_IMAGE_TYPES.has(ct)) {
      // Le corps n'est jamais lu sur ce chemin : sous workerd, une réponse non
      // consommée retient la sous-requête. Annulé ICI plutôt qu'à chaque
      // branche en amont, parce que c'est le point de passage unique de tous
      // les refus de type — y compris ceux qui précèdent le second essai
      // (text/html, et tout ce qui n'est pas une image).
      await resp.body?.cancel().catch(() => {});
      return { ok: false, reason: "bad_content_type" };
    }

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

    return { ok: true, bytes: buffer, contentType: ct, size: total };
  } finally {
    clearTimeout(timer);
  }
}
