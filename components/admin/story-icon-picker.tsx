"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_ICON_NAMES, type HighlightIconName } from "@/lib/validations/product-story";
import { HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";

interface StoryIconPickerProps {
  value: HighlightIconName | "";
  onChange: (name: HighlightIconName) => void;
  className?: string;
}

export function StoryIconPicker({ value, onChange, className }: StoryIconPickerProps) {
  const [open, setOpen] = useState(false);
  const icon = value ? HIGHLIGHT_ICON_MAP[value] : HIGHLIGHT_ICON_MAP["star"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-touch"
          className={cn("shrink-0", className)}
          aria-label="Choisir une icône"
        >
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="grid grid-cols-6 gap-1">
          {HIGHLIGHT_ICON_NAMES.map((name) => {
            const isSelected = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={isSelected}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
                  isSelected && "bg-accent text-foreground ring-2 ring-primary",
                )}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <HugeiconsIcon
                  icon={HIGHLIGHT_ICON_MAP[name]}
                  size={20}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
