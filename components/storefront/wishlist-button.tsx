"use client";

import { useTransition, useOptimistic } from "react";
import { toggleWishlist } from "@/actions/wishlist";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  isWishlisted: boolean;
  className?: string;
}

export function WishlistButton({ productId, isWishlisted, className }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isWishlisted);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic(!optimistic);
      await toggleWishlist(productId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive",
        optimistic && "text-destructive",
        className
      )}
      aria-label={optimistic ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="size-[45%]"
        fill={optimistic ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
