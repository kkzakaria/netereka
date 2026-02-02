"use client";

import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = "sm", readonly = false }: Props) {
  const starSize = size === "md" ? "size-5" : "size-4";

  return (
    <div className="inline-flex gap-0.5" role={readonly ? "img" : "radiogroup"} aria-label={`${value} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            starSize,
            "transition-colors",
            !readonly && "cursor-pointer hover:text-yellow-500",
            readonly && "cursor-default"
          )}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= value ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            className={cn(
              "size-full",
              star <= value ? "text-yellow-500" : "text-muted-foreground/40"
            )}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
