"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { checkWishlist } from "@/actions/wishlist";

export function WishlistButtonDynamic({ productId }: { productId: string }) {
  const session = authClient.useSession();
  const [isWishlisted, setIsWishlisted] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (session.data?.user) {
      checkWishlist(productId).then(setIsWishlisted).catch(console.error);
    } else {
      setIsWishlisted(undefined);
    }
  }, [session.data?.user, productId]);

  if (!session.data?.user || isWishlisted === undefined) return null;

  return (
    <WishlistButton
      productId={productId}
      isWishlisted={isWishlisted}
      onToggled={setIsWishlisted}
    />
  );
}
