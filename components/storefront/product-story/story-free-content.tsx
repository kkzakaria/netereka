import { cn } from "@/lib/utils";

interface StoryFreeContentProps {
  /** HTML déjà assaini par `descriptionToHtml` — calculé une seule fois par l'appelant. */
  html: string;
  descriptionType?: string;
  productId?: string;
}

/**
 * Mise en page du contenu libre.
 *
 * En mode `html`, on ne contraint ni la largeur ni la mise en page. C'est
 * tout l'objet de ce lot — l'auteur compose sa page, et `nk-container` lui
 * rend une largeur de lecture là où il la veut, au lieu de la lui imposer
 * partout. `prose` disparaît, mais pas toute typographie : `nk-prose`
 * (app/globals.css) restaure un plancher minimal — titres, listes, lien,
 * séparateur, citation — sur les éléments nus, sans toucher à la largeur ni
 * à la mise en page. Nécessaire pour les documents HTML rédigés avant la
 * conversion, qui n'ont jamais reçu le vocabulaire nk- et s'appuyaient sur
 * `prose` pour leur mise en forme.
 *
 * En mode `richtext`, le conteneur `prose` reste : ce mode existe pour écrire
 * du texte sans penser à la mise en forme, et le priver de `prose` le rendrait
 * illisible.
 */
export function freeContentLayout(descriptionType: string | undefined): {
  outerClass: string;
  innerClass: string;
} {
  if (descriptionType === "html") {
    return { outerClass: "", innerClass: "nk-prose" };
  }
  return {
    outerClass: "mx-auto max-w-3xl px-6",
    innerClass: "prose prose-lg max-w-none dark:prose-invert",
  };
}

export function StoryFreeContent({
  html,
  descriptionType,
  productId,
}: StoryFreeContentProps) {
  const { outerClass, innerClass } = freeContentLayout(descriptionType);
  // Le scoping CSS est inscrit dans le HTML stocké sous la forme
  // `.desc-<productId>` : sans cette classe sur un ancêtre, le <style> de
  // l'auteur ne s'applique à rien.
  const scopeClass =
    descriptionType === "html" && productId ? `desc-${productId}` : undefined;

  return (
    <div className={outerClass || undefined}>
      <div
        className={cn(innerClass, scopeClass) || undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
