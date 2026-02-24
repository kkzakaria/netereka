"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ id, name, value, onChange, className }: ColorPickerProps) {
  return (
    <PopoverPrimitive.Root>
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          className={cn(
            "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border px-2 hover:bg-accent",
            className
          )}
        >
          <span
            className="h-6 w-6 shrink-0 rounded border border-black/10"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm">{value.toUpperCase()}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[200px] rounded-xl border bg-popover p-3 shadow-lg"
        >
          <HexColorPicker
            color={value}
            onChange={onChange}
            style={{ width: "100%" }}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">#</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              className="h-8 flex-1 rounded-md border bg-background px-2 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <PopoverPrimitive.Arrow className="fill-border" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
