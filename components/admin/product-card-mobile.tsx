"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Edit02Icon,
  ViewIcon,
  ViewOffIcon,
  StarIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";
import { getImageUrl } from "@/lib/utils/images";
import { formatPrice } from "@/lib/utils";
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
} from "@/actions/admin/products";

interface ProductCardMobileProps {
  product: {
    id: string;
    name: string;
    brand: string | null;
    sku: string | null;
    category_name?: string | null;
    base_price: number;
    stock_quantity: number;
    is_active: number;
    is_featured: number;
    image_url?: string | null;
  };
}

export function ProductCardMobile({ product }: ProductCardMobileProps) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleProductActive(product.id);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleToggleFeatured() {
    startTransition(async () => {
      const result = await toggleProductFeatured(product.id);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success("Produit supprimé");
      } else {
        toast.error(result.error);
      }
    });
  }

  const actions: ActionSheetItem[] = [
    {
      label: "Modifier",
      icon: Edit02Icon,
      onClick: () => {
        window.location.href = `/products/${product.id}/edit`;
      },
    },
    {
      label: product.is_active === 1 ? "Désactiver" : "Activer",
      icon: product.is_active === 1 ? ViewOffIcon : ViewIcon,
      onClick: handleToggleActive,
    },
    {
      label: product.is_featured === 1 ? "Retirer vedette" : "Mettre en vedette",
      icon: StarIcon,
      onClick: handleToggleFeatured,
    },
    {
      label: "Supprimer",
      icon: Delete02Icon,
      onClick: handleDelete,
      destructive: true,
      requiresConfirm: true,
    },
  ];

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30"
        data-pending={isPending || undefined}
      >
        {/* Image */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {product.image_url ? (
            <Image
              src={getImageUrl(product.image_url)}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <span className="text-2xl">📦</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <Link
            href={`/products/${product.id}/edit`}
            className="truncate text-sm font-medium hover:underline"
          >
            {product.name}
          </Link>
          {product.brand && (
            <span className="truncate text-xs text-muted-foreground">
              {product.brand}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {product.category_name && (
              <Badge variant="secondary" className="text-[10px]">
                {product.category_name}
              </Badge>
            )}
            {product.is_active === 1 ? (
              <Badge variant="default" className="text-[10px]">
                Actif
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Inactif
              </Badge>
            )}
            {product.is_featured === 1 && (
              <Badge variant="outline" className="text-[10px]">
                Vedette
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="tabular-nums font-semibold">
              {formatPrice(product.base_price)}
            </span>
            <Badge
              variant={product.stock_quantity <= 5 ? "destructive" : "secondary"}
              className="text-[10px]"
            >
              Stock: {product.stock_quantity}
            </Badge>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => setActionSheetOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="Actions"
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
        </button>
      </div>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={product.name}
        items={actions}
      />
    </>
  );
}
