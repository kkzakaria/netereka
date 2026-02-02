"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { Button } from "@/components/ui/button";
import { toggleWishlist } from "@/actions/wishlist";
import { toast } from "sonner";

interface WishlistClientItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  base_price: number;
  brand: string | null;
  image_url: string | null;
}

export function WishlistGrid({ items }: { items: WishlistClientItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <WishlistCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function WishlistCard({ item }: { item: WishlistClientItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      await toggleWishlist(item.product_id);
      toast.success("Retiré des favoris");
      router.refresh();
    });
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card">
      <Link href={`/p/${item.slug}`} className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={getImageUrl(item.image_url)}
          alt={item.name}
          fill
          className="object-contain p-4"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {item.brand && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {item.brand}
          </span>
        )}
        <Link href={`/p/${item.slug}`} className="line-clamp-2 text-sm font-medium leading-tight hover:underline">
          {item.name}
        </Link>
        <p className="mt-auto pt-1 text-sm font-bold">{formatPrice(item.base_price)}</p>
        <Button
          variant="ghost"
          size="xs"
          className="mt-1 w-full text-destructive"
          onClick={handleRemove}
          disabled={pending}
        >
          Retirer
        </Button>
      </div>
    </div>
  );
}
