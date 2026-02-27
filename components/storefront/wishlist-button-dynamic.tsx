"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth/client";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { checkWishlist } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";

const AuthDialog = dynamic(
  () =>
    import("@/components/storefront/auth-dialog")
      .then((m) => m.AuthDialog)
      .catch((err) => {
        console.error("[wishlist-button-dynamic] Failed to load AuthDialog chunk", err);
        throw err;
      }),
  { ssr: false }
);

function prefetchAuthDialog(): void {
  // Prefetch failure is non-critical; click will retry via dynamic()
  void import("@/components/storefront/auth-dialog").catch(() => {});
}

export function WishlistButtonDynamic({ productId }: { productId: string }) {
  const session = authClient.useSession();
  const [isWishlisted, setIsWishlisted] = useState<boolean | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAuthenticated = !!session.data?.user;

  useEffect(() => {
    if (!isAuthenticated) return;
    checkWishlist(productId)
      .then(setIsWishlisted)
      .catch((err) => {
        console.error("[wishlist-button-dynamic] checkWishlist failed for productId:", productId, err);
        setIsWishlisted(false);
      });
  }, [isAuthenticated, productId]);

  // Authenticated and wishlist status known
  if (isAuthenticated && isWishlisted !== undefined) {
    return (
      <WishlistButton
        productId={productId}
        isWishlisted={isWishlisted}
        onToggled={setIsWishlisted}
      />
    );
  }

  // Not authenticated -- show ghost button that opens auth dialog
  if (!isAuthenticated) {
    return (
      <>
        <Button
          type="button"
          size="icon-touch"
          variant="outline"
          className="hover:text-destructive hover:border-destructive/50"
          onMouseEnter={prefetchAuthDialog}
          onFocus={prefetchAuthDialog}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDialogOpen(true);
          }}
          aria-label="Ajouter aux favoris"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </Button>

        {dialogOpen && (
          <AuthDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            productId={productId}
          />
        )}
      </>
    );
  }

  // Authenticated but wishlist status still loading
  return null;
}
