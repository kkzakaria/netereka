"use client";

import { useTransition, useOptimistic } from "react";
import { toast } from "sonner";
import { toggleWishlist } from "@/actions/wishlist";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  productId: string;
  isWishlisted: boolean;
  onToggled?: (added: boolean) => void;
  className?: string;
}

export function WishlistButton({ productId, isWishlisted, onToggled, className }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isWishlisted);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleWishlist(productId);
      if (!result.success) {
        setOptimistic(optimistic);
        toast.error("Impossible de mettre à jour les favoris. Réessayez.");
        return;
      }
      onToggled?.(result.added);
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      size="icon-lg"
      variant={optimistic ? "destructive" : "outline"}
      className={cn(!optimistic && "hover:text-destructive hover:border-destructive/50", className)}
      aria-label={optimistic ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={optimistic ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </Button>
  );
}
