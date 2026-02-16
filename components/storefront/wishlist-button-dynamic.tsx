"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { checkWishlist } from "@/actions/wishlist";

export function WishlistButtonDynamic({ productId }: { productId: string }) {
  const session = authClient.useSession();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (session.data?.user) {
      checkWishlist(productId).then(setIsWishlisted).catch(console.error);
    }
  }, [session.data?.user, productId]);

  if (!session.data?.user) return null;

  return (
    <WishlistButton
      productId={productId}
      isWishlisted={isWishlisted}
      onToggled={setIsWishlisted}
    />
  );
}
