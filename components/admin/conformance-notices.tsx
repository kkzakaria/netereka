"use client";

import { useMemo } from "react";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

/**
 * Affiche les écarts d'un document de contenu libre à la charte du site.
 *
 * Ce sont des AVERTISSEMENTS : rien n'est bloqué, l'enregistrement reste
 * possible avec des écarts (§ 2.2 du spec). Le rédacteur décide.
 */
export function ConformanceNotices({ html }: { html: string }) {
  const issues = useMemo(() => checkDesignConformance(html), [html]);
  if (issues.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-sm font-medium">
        {issues.length === 1
          ? "1 écart à la charte"
          : `${issues.length} écarts à la charte`}
        {" — l'enregistrement reste possible."}
      </p>
      <ul className="mt-2 space-y-1.5">
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${issue.line}-${i}`} className="text-sm text-muted-foreground">
            <span className="font-mono text-xs">ligne {issue.line}</span> — {issue.suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}
