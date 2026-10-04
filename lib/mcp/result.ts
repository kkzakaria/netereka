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
 * ORDRE : l'image d'abord. Les métadonnées en tête repoussent l'image hors du
 * premier bloc, et plusieurs clients n'affichent que celui-là.
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
 * Le premier bloc TEXTE d'un résultat, quel que soit son rang.
 *
 * Depuis `view_image`, le premier bloc peut être une image : lire
 * `content[0].text` n'est plus vrai pour tous les outils, et les appelants
 * qui le faisaient liraient `undefined`.
 */
export function textOf(result: ToolResult): string {
  const bloc = result.content.find((c): c is Extract<ToolContent, { type: "text" }> => c.type === "text");
  if (!bloc) throw new Error("[mcp] résultat sans bloc texte");
  return bloc.text;
}

export function fail(code: McpErrorCode, message: string, fieldErrors?: Record<string, string[]>): ToolResult {
  const body: Record<string, unknown> = { code, message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return { content: [{ type: "text", text: JSON.stringify(body) }], isError: true };
}
