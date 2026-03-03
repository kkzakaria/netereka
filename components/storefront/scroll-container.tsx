"use client";

import type { ReactNode } from "react";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { ScrollButtons } from "@/components/storefront/scroll-buttons";

export function ScrollContainer({ children }: { children: ReactNode }) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll, dragProps } =
    useHorizontalScroll();

  return (
    <div className="group relative">
      <ScrollButtons
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScroll={scroll}
      />
      <div
        ref={scrollRef}
        {...dragProps}
        className="flex cursor-grab select-none gap-3 overflow-x-auto pb-2 scrollbar-none active:cursor-grabbing sm:gap-4"
      >
        {children}
      </div>
    </div>
  );
}
