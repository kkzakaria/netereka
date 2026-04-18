"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ProductFaqItem } from "@/lib/db/types";

interface StoryFaqProps {
  faq: ProductFaqItem[];
}

export function StoryFaq({ faq }: StoryFaqProps) {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <h2 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faq.map((item, i) => {
          const id = `faq-${i}-${item.question.slice(0, 40)}`;
          return (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="text-left text-lg font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
