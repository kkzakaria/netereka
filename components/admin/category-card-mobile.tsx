"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Edit02Icon,
  Delete02Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { ActionSheet, type ActionSheetItem } from "./action-sheet";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import { deleteCategory } from "@/actions/admin/categories";

interface CategoryCardMobileProps {
  category: CategoryWithCount;
  onEdit: (category: CategoryWithCount) => void;
}

export function CategoryCardMobile({
  category,
  onEdit,
}: CategoryCardMobileProps) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.success) {
        toast.success("Catégorie supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  const actions: ActionSheetItem[] = [
    {
      label: "Modifier",
      icon: Edit02Icon,
      onClick: () => onEdit(category),
    },
    {
      label: "Supprimer",
      icon: Delete02Icon,
      onClick: handleDelete,
      destructive: true,
      requiresConfirm: category.product_count > 0 ? false : true,
    },
  ];

  // Show warning instead of confirm for categories with products
  if (category.product_count > 0) {
    actions[1] = {
      label: `Supprimer (${category.product_count} produit${category.product_count > 1 ? "s" : ""})`,
      icon: Delete02Icon,
      onClick: () => {
        toast.error(
          `Impossible de supprimer : ${category.product_count} produit(s) liés`
        );
      },
      destructive: true,
    };
  }

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30"
        data-pending={isPending || undefined}
      >
        {/* Icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <HugeiconsIcon
            icon={Folder01Icon}
            size={24}
            className="text-muted-foreground"
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <span className="truncate text-sm font-medium">{category.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {category.slug}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={category.is_active ? "default" : "secondary"}>
              {category.is_active ? "Active" : "Inactive"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {category.product_count} produit
              {category.product_count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              Ordre: {category.sort_order}
            </span>
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
        title={category.name}
        items={actions}
      />
    </>
  );
}
