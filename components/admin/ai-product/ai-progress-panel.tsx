"use client";

export type ProgressStep = "search" | "specs" | "images" | "finalize";

const LABELS: Record<ProgressStep, string> = {
  search:   "Recherche du produit",
  specs:    "Récupération des spécifications",
  images:   "Recherche d'images",
  finalize: "Génération de la fiche",
};

const ORDER: ProgressStep[] = ["search", "specs", "images", "finalize"];

interface AiProgressPanelProps {
  completed: Set<ProgressStep>;
  active: ProgressStep | null;
}

export function AiProgressPanel({ completed, active }: AiProgressPanelProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Génération en cours</h2>
      <ul className="space-y-2">
        {ORDER.map((step) => {
          const isDone = completed.has(step);
          const isActive = active === step;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={
                  isDone ? "text-emerald-600" :
                  isActive ? "text-amber-500 animate-pulse" :
                  "text-muted-foreground"
                }
              >
                {isDone ? "✓" : isActive ? "⏳" : "○"}
              </span>
              <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>
                {LABELS[step]}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-xs text-muted-foreground">Peut prendre jusqu&apos;à 90 secondes.</p>
    </div>
  );
}
