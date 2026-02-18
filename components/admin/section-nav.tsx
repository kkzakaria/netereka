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

export function SectionNav({ sections, submitLabel, isPending }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
