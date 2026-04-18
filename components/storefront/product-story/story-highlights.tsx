import { HugeiconsIcon } from "@hugeicons/react";
import type { ProductHighlight } from "@/lib/db/types";
import { resolveHighlightIcon } from "./icons";

interface StoryHighlightsProps {
  highlights: ProductHighlight[];
}

export function StoryHighlights({ highlights }: StoryHighlightsProps) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
        {highlights.map((item, idx) => (
          <div
            key={`${item.icon}-${idx}`}
            className="flex flex-col items-center text-center"
          >
            <HugeiconsIcon
              icon={resolveHighlightIcon(item.icon)}
              size={40}
              strokeWidth={1.5}
              className="text-foreground"
            />
            <p className="mt-4 text-base font-medium leading-snug">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
