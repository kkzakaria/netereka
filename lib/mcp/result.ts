export type McpErrorCode = "validation_error" | "not_found" | "conflict" | "limit_exceeded" | "internal_error";

/** Un bloc de contenu rendu au client : du texte, ou une image que le modèle
 *  VOIT. Le second existe pour `view_image` — un assistant qui compose une
 *  bannière disait ne pas pouvoir juger les couleurs, et aucune description
 *  textuelle ne remplace le fait de regarder. */
export type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
  [key: string]: unknown;
}

export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

/**
 * Une image que le modèle voit, suivie du texte qui dit ce qu'il regarde.
 *
 * ORDRE : l'image d'abord, par PRÉCAUTION. La spécification MCP n'impose
 * aucun ordre et un client conforme rend tous les blocs ; je n'ai observé
 * aucun client qui n'en rendrait qu'un. Mais si l'un le faisait, c'est
 * l'image qu'il montrerait, et non des métadonnées. Le test par vrai client
 * (`tools-view-image.test.ts`) fixe cet ordre.
 */
export function okWithImage(image: { base64: string; mimeType: string }, data: unknown): ToolResult {
  return {
    content: [
      { type: "image", data: image.base64, mimeType: image.mimeType },
      { type: "text", text: JSON.stringify(data) },
    ],
  };
}

/**
 * PLUSIEURS images, puis le texte qui dit ce qu'on regarde.
 *
 * `apercu_revision` en rend deux — mobile et bureau — et les deux ensemble
 * sont le propos : un défaut de mise en page n'apparaît le plus souvent que
 * sur un seul des deux écrans, et c'est la COMPARAISON qui le montre. Les
 * rendre en deux appels laisserait au modèle le soin de se souvenir du
 * premier.
 *
 * Même ordre que `okWithImage`, et pour la même raison : si un client ne
 * rendait qu'un bloc, ce serait une image et non des métadonnées.
 */
export function okWithImages(
  images: readonly { base64: string; mimeType: string }[],
  data: unknown,
): ToolResult {
  return {
    content: [
      ...images.map((i) => ({ type: "image" as const, data: i.base64, mimeType: i.mimeType })),
      { type: "text" as const, text: JSON.stringify(data) },
    ],
  };
}

/**
 * Le premier bloc TEXTE d'un résultat, quel que soit son rang.
 *
 * Depuis `view_image`, le premier bloc peut être une image : lire
 * `content[0].text` n'est plus vrai pour tous les outils, et les appelants
 * qui le faisaient liraient `undefined`.
 */
export function textOf(result: ToolResult): string {
  const bloc = result.content.find((c): c is Extract<ToolContent, { type: "text" }> => c.type === "text");
  if (!bloc) {
    throw new Error(`[mcp] résultat sans bloc texte (blocs : ${result.content.map((c) => c.type).join(", ") || "aucun"})`);
  }
  return bloc.text;
}

export function fail(code: McpErrorCode, message: string, fieldErrors?: Record<string, string[]>): ToolResult {
  const body: Record<string, unknown> = { code, message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return { content: [{ type: "text", text: JSON.stringify(body) }], isError: true };
}
