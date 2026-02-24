"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SectionDef {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionDef[];
  submitLabel: string;
  isPending: boolean;
}

// How far from the top of <main> a section header must be to become active
const HEADER_OFFSET = 120;
// How many px from max scroll is considered "near bottom"
const NEAR_BOTTOM_PX = 50;

export function SectionNav({ sections, submitLabel, isPending }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const scrollEl = document.querySelector("main");
    if (!scrollEl) return;

    function updateActive() {
      const mainTop = scrollEl!.getBoundingClientRect().top;
      const clientHeight = scrollEl!.clientHeight;
      const isNearBottom =
        scrollEl!.scrollTop >= scrollEl!.scrollHeight - clientHeight - NEAR_BOTTOM_PX;

      // Default to first section so the nav always has an active item
      let active = sections[0]?.id ?? "";

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const relTop = rect.top - mainTop;
        const relBottom = rect.bottom - mainTop;

        if (isNearBottom) {
          // Near bottom: pick the last section still (partially) visible
          if (relBottom > 0 && relTop < clientHeight) active = section.id;
        } else {
          // Normal: pick the last section whose top has passed the threshold
          if (relTop <= HEADER_OFFSET) active = section.id;
        }
      }

      setActiveSection(active);
    }

    scrollEl.addEventListener("scroll", updateActive, { passive: true });
    updateActive(); // set correct state on mount

    return () => scrollEl.removeEventListener("scroll", updateActive);
  }, [sections]);

  function scrollToSection(id: string) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="sticky top-20 space-y-4">
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "block w-full rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors",
              activeSection === section.id
                ? "border-primary bg-primary/5 font-medium text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement\u2026" : submitLabel}
      </Button>
    </div>
  );
}
