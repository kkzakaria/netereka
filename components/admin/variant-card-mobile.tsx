"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/lib/db/types";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";

interface VariantCardMobileProps {
  variant: ProductVariant;
  onEdit: (variant: ProductVariant) => void;
  onDelete: (variantId: string) => void;
  isPending?: boolean;
}

export function VariantCardMobile({
  variant,
  onEdit,
  onDelete,
  isPending,
}: VariantCardMobileProps) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const actions: ActionSheetItem[] = [
    {
      label: "Modifier",
      onClick: () => onEdit(variant),
    },
    {
      label: "Supprimer",
      onClick: () => onDelete(variant.id),
      destructive: true,
      requiresConfirm: true,
    },
  ];

  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-card p-3 touch-manipulation"
      data-pending={isPending || undefined}
    >
      {/* Variant info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{variant.name}</span>
          <Badge variant={variant.is_active ? "default" : "secondary"} className="shrink-0">
            {variant.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {variant.sku && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            SKU: {variant.sku}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatPrice(variant.price)}
          </span>
          <Badge
            variant={variant.stock_quantity <= 5 ? "destructive" : "secondary"}
          >
            Stock: {variant.stock_quantity}
          </Badge>
        </div>
      </div>

      {/* Action button */}
      <Button
        variant="ghost"
        size="icon-touch"
        onClick={() => setActionSheetOpen(true)}
        aria-label="Actions"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={20} />
      </Button>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={variant.name}
        items={actions}
      />
    </div>
  );
}
