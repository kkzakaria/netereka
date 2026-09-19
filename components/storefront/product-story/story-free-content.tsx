import { cn } from "@/lib/utils";

interface StoryFreeContentProps {
  /** HTML déjà assaini par `descriptionToHtml` — calculé une seule fois par l'appelant. */
  html: string;
  descriptionType?: string;
  productId?: string;
}

export function StoryFreeContent({
  html,
  descriptionType,
  productId,
}: StoryFreeContentProps) {
  const scopeClass =
    descriptionType === "html" && productId ? `desc-${productId}` : undefined;
  return (
    <div className="mx-auto max-w-3xl px-6">
      <div
        className={cn("prose prose-lg max-w-none dark:prose-invert", scopeClass)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
