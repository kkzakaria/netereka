"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { GridIcon, Menu01Icon } from "@hugeicons/core-free-icons";
import { useViewMode, type ViewMode } from "./view-context";
import { cn } from "@/lib/utils";

const modes: { value: ViewMode; icon: typeof GridIcon; label: string }[] = [
  { value: "cards", icon: GridIcon, label: "Vue cartes" },
  { value: "table", icon: Menu01Icon, label: "Vue tableau" },
];

export function ViewSwitcher() {
  const { mode, setMode, effectiveMode } = useViewMode();

  return (
    <div className="inline-flex h-9 items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {modes.map(({ value, icon, label }) => {
        const isActive =
          mode === value || (mode === "auto" && effectiveMode === value);

        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              "hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              isActive && "bg-background shadow-sm"
            )}
          >
            <HugeiconsIcon
              icon={icon}
              size={16}
              className={cn(
                "text-muted-foreground transition-colors",
                isActive && "text-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
