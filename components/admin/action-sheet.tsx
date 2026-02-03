"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface ActionSheetItem {
  label: string;
  icon?: typeof Cancel;
  onClick: () => void;
  destructive?: boolean;
  requiresConfirm?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: ActionSheetItem[];
}

export function ActionSheet({
  open,
  onOpenChange,
  title,
  items,
}: ActionSheetProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  // Wrapper to reset confirmation state when closing
  function handleClose() {
    setConfirmIndex(null);
    onOpenChange(false);
  }

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  // Keyboard handler - always register cleanup to prevent memory leak
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        if (confirmIndex !== null) {
          setConfirmIndex(null);
        } else {
          setConfirmIndex(null);
          onOpenChange(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirmIndex, onOpenChange]);

  function handleItemClick(item: ActionSheetItem, index: number) {
    if (item.requiresConfirm && confirmIndex !== index) {
      setConfirmIndex(index);
      return;
    }
    item.onClick();
    handleClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label={title || "Actions"}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl bg-background shadow-xl transition-transform duration-300 ease-out pb-safe",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{title || "Actions"}</h2>
          <button
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            aria-label="Fermer"
          >
            <HugeiconsIcon icon={Cancel} size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col p-2 touch-manipulation">
          {items.map((item, index) => {
            const isConfirming = confirmIndex === index;

            return (
              <button
                key={index}
                onClick={() => handleItemClick(item, index)}
                className={cn(
                  "flex h-[52px] items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors",
                  "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
                  item.destructive && "text-destructive hover:bg-destructive/10",
                  isConfirming && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
              >
                {item.icon && (
                  <HugeiconsIcon icon={item.icon} size={20} aria-hidden="true" />
                )}
                <span>
                  {isConfirming ? "Confirmer la suppression" : item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cancel button */}
        <div className="border-t p-2">
          <button
            onClick={handleClose}
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}

interface ActionSheetTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  onClick: () => void;
}

export function ActionSheetTrigger({
  children,
  onClick,
}: ActionSheetTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}
