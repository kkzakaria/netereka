import type { AvertissementApercu } from "@/lib/revisions/apercu-avertissements";

/**
 * Les avertissements d'un aperçu, posés AU-DESSUS du rendu.
 *
 * Au-dessus, et pas en dessous : ce qu'ils disent change la lecture de tout
 * ce qui suit — « cette révision est rejetée », « la cible a bougé,
 * l'application refusera ». Les lire après avoir jugé le rendu ne sert plus
 * à rien.
 */
export function ApercuAvertissements({ avertissements }: { avertissements: AvertissementApercu[] }) {
  if (avertissements.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <ul className="space-y-2">
        {avertissements.map((a, i) => (
          <li
            key={i}
            className={
              a.bloquant
                ? "rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground"
                : "rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            }
          >
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
