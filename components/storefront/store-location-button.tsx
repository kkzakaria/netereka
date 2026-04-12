"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { StoreLocation01Icon } from "@hugeicons/core-free-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ActiveStore } from "@/lib/db/stores";

const iconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function StoreLocationButton({
  stores,
}: {
  stores: ActiveStore[];
}) {
  if (stores.length === 0) return null;

  if (stores.length === 1) {
    const store = stores[0];
    return (
      <a
        href={store.google_maps_url}
        target="_blank"
        rel="noopener noreferrer"
        className={iconButtonClass}
        aria-label={`${store.name} — voir sur Google Maps`}
      >
        <HugeiconsIcon icon={StoreLocation01Icon} size={20} />
      </a>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={iconButtonClass}
          aria-label="Nos boutiques"
        >
          <HugeiconsIcon icon={StoreLocation01Icon} size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Nos boutiques</p>
        </div>
        <div className="divide-y">
          {stores.map((store) => (
            <a
              key={store.id}
              href={store.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <p className="text-sm font-medium">{store.name}</p>
              <p className="text-xs text-muted-foreground">{store.address}</p>
              {store.phone && (
                <p className="text-xs text-muted-foreground">{store.phone}</p>
              )}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
