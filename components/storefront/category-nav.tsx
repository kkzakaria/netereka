import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Smartphone,
  Laptop,
  Tablet,
  Clock,
  Headset,
  Package,
  Gamepad,
  Television,
  Projector,
} from "@hugeicons/core-free-icons";
import type { Category } from "@/lib/db/types";

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  smartphones: Smartphone,
  ordinateurs: Laptop,
  tablettes: Tablet,
  "montres-connectees": Clock,
  ecouteurs: Headset,
  accessoires: Package,
  jeux: Gamepad,
  televiseurs: Television,
  projecteurs: Projector,
};

export function CategoryNav({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const icon = CATEGORY_ICONS[cat.slug];
        return (
          <Link
            key={cat.id}
            href={`/c/${cat.slug}`}
            className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {icon && (
              <HugeiconsIcon icon={icon} size={16} />
            )}
            {cat.name}
          </Link>
        );
      })}
    </div>
  );
}
