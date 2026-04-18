import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductFeatureBlock } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";

interface StoryFeatureBlockProps {
  block: ProductFeatureBlock;
  /** 0-indexed position among feature blocks — determines zig-zag direction */
  index: number;
}

export function StoryFeatureBlock({ block, index }: StoryFeatureBlockProps) {
  const hasImage = !!block.image_url;
  const isOdd = index % 2 === 1;

  return (
    <div className="mx-auto max-w-6xl px-6">
      {hasImage ? (
        <div
          className={cn(
            "grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16",
            // zig-zag on md+: odd indices (2nd, 4th, …) invert image/text order
            isOdd && "md:[&>*:first-child]:order-2",
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src={getImageUrl(block.image_url!)}
              alt={block.image_alt || block.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {block.title}
            </h3>
            <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {block.body}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {block.title}
          </h3>
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {block.body}
          </p>
        </div>
      )}
    </div>
  );
}
