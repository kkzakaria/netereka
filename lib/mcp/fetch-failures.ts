import type { FetchBytesResult, FetchImageResult } from "@/lib/storage/fetch-image";
import type { McpErrorCode } from "@/lib/mcp/result";

type FetchFailure = Exclude<FetchImageResult | FetchBytesResult, { ok: true }>["reason"];

/**
 * Chaque échec typé du téléchargement garde son identité jusqu'au client,
 * comme `SEARCH_FAILURES` (lib/mcp/tools/images.ts). Replier les six sur
 * « image inaccessible » enverrait le modèle chercher une autre URL quand la
 * cause est un AVIF (changer d'URL n'y changera rien) ou une panne de notre
 * stockage (rien de ce qu'il tentera n'aidera). Le `Record` est exhaustif par
 * construction : une raison ajoutée à `FetchImageResult` casse la compilation
 * au lieu de tomber dans un repli muet.
 */
export const FETCH_FAILURES: Record<FetchFailure, { code: McpErrorCode; message: string }> = {
  ssrf: {
    code: "validation_error",
    message: "Cette URL vise une adresse interne ou un protocole non http(s). Donnez une URL publique.",
  },
  bad_status: {
    code: "validation_error",
    message: "L'hôte a refusé de servir cette image. Vérifiez l'URL, ou prenez-en une autre.",
  },
  bad_content_type: {
    code: "validation_error",
    message:
      "Nous n'acceptons que le JPEG, le PNG et le WebP. L'AVIF est refusé : le redimensionneur de la " +
      "vitrine ne sait pas le lire, et une image AVIF mise en ligne serait invisible.",
  },
  too_large: { code: "validation_error", message: "Image trop lourde : 5 Mo au maximum." },
  timeout: { code: "internal_error", message: "L'hôte n'a pas répondu en 10 secondes. Réessayez ou changez d'URL." },
  fetch_failed: { code: "internal_error", message: "Téléchargement impossible depuis cette URL." },
  upload_failed: {
    code: "internal_error",
    message: "L'image a été téléchargée mais le stockage de la boutique l'a refusée. Prévenez un administrateur.",
  },
};
