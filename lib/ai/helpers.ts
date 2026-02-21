import { callTextModel } from "@/lib/ai";
import type { CategoryNode } from "@/lib/db/types";

export function flattenCategories(
  nodes: readonly CategoryNode[],
  parentName?: string
): Array<{ id: string; name: string; parentName?: string }> {
  const result: Array<{ id: string; name: string; parentName?: string }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, parentName });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, node.name));
    }
  }
  return result;
}

export async function runTextModel(
  system: string,
  user: string,
  retryCount = 0
): Promise<string> {
  const raw = await callTextModel(system, user);

  try {
    JSON.parse(raw);
    return raw;
  } catch {
    console.warn("[ai/helpers] runTextModel: LLM returned non-JSON, attempting regex extraction");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {
        console.error("[ai/helpers] runTextModel: regex extraction also failed, will retry if possible");
      }
    }

    if (retryCount < 1) {
      return runTextModel(
        system +
          "\n\nIMPORTANT: Retourne UNIQUEMENT du JSON valide. Pas de texte, pas de markdown, juste l'objet JSON.",
        user,
        retryCount + 1
      );
    }
    throw new Error("Le modèle n'a pas retourné de JSON valide.");
  }
}
