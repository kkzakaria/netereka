"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiProductOutput } from "@/lib/validations/product-ai";

interface AiImageSelectorProps {
  output: AiProductOutput;
  onConfirm: (selectedUrls: string[]) => void;
  onCancel: () => void;
  busy: boolean;
}

// MIN = 0 — Claude is allowed to return image_candidates: [] when web_search
// didn't surface any URL it can copy verbatim; admin then proceeds without
// images and adds them manually after the draft is created.
const MIN = 0;
const MAX = 8;

export function AiImageSelector({ output, onConfirm, onCancel, busy }: AiImageSelectorProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    output.image_candidates.slice(0, Math.min(4, output.image_candidates.length)).map((c) => c.url),
  );

  function toggle(url: string) {
    setSelected((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= MAX) return prev;
      return [...prev, url];
    });
  }

  const canConfirm = selected.length >= MIN && !busy;
  const noCandidates = output.image_candidates.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fiche prête · sélectionnez les images</h2>
        <p className="text-sm text-muted-foreground">
          <strong>{output.name}</strong>
          {output.attributes.colors.length > 0 && ` · ${output.attributes.colors.length} couleurs détectées`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {noCandidates
            ? "L'IA n'a pas trouvé d'images fiables. Continuez sans images puis ajoutez-les manuellement après création."
            : `Choisissez jusqu'à ${MAX} images. La 1re cochée sera l'image principale.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {output.image_candidates.map((c) => {
          const isSelected = selected.includes(c.url);
          const index = selected.indexOf(c.url);
          return (
            <button
              key={c.url}
              type="button"
              disabled={busy}
              onClick={() => toggle(c.url)}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? "Désélectionner" : "Sélectionner"} l'image ${c.alt ? `« ${c.alt} »` : ""} de ${c.source_domain}`.trim()}
              className={`group relative overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-foreground"
              }`}
            >
              <div className="relative aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.url}
                  alt={c.alt ?? ""}
                  className="h-full w-full object-contain"
                  // Many manufacturer/news sites block hotlinks based on the
                  // Referer header; stripping it makes the cross-origin preview
                  // succeed on more sources.
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                {isSelected && (
                  <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                )}
              </div>
              <p className="truncate px-2 py-1 text-xs text-muted-foreground">{c.source_domain}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button type="button" disabled={!canConfirm} onClick={() => onConfirm(selected)}>
          {busy
            ? "Importation…"
            : selected.length === 0
              ? "Continuer sans images"
              : `Importer et continuer (${selected.length})`}
        </Button>
      </div>
    </div>
  );
}
