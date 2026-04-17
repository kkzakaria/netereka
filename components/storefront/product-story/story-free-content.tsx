import { cn } from "@/lib/utils";
import { descriptionToHtml } from "@/lib/utils/description-to-html";

interface StoryFreeContentProps {
  description: string;
  descriptionType?: string;
  productId?: string;
}

export function StoryFreeContent({
  description,
  descriptionType,
  productId,
}: StoryFreeContentProps) {
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;
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
