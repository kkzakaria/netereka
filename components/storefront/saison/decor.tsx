/**
 * Décor des fêtes : SVG en ligne, statiques, sans animation ni image raster,
 * pour ne rien coûter au chargement mobile. Purement décoratifs, donc
 * masqués aux lecteurs d'écran. Les couleurs viennent des tokens
 * `--festif-*`, qui n'existent que sous `[data-saison="fetes"]`.
 */

function Etoile({ x, y, r, couleur }: { x: number; y: number; r: number; couleur: string }) {
  // Étoile à cinq branches centrée sur (x, y).
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rayon = i % 2 === 0 ? r : r * 0.45;
    return `${(x + rayon * Math.cos(angle)).toFixed(2)},${(y + rayon * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} fill={couleur} />;
}

/** Guirlande d'étoiles en pleine largeur, posée sur le bord bas de l'en-tête. */
export function GuirlandeEtoiles() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-0 -bottom-[7px] h-3 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="guirlande-fetes" width="48" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q12 9 24 3 T48 3" fill="none" stroke="currentColor" strokeOpacity="0.25" />
          <Etoile x={12} y={6.5} r={4} couleur="var(--festif-or)" />
          <Etoile x={36} y={6.5} r={3} couleur="var(--festif-rouge)" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill="url(#guirlande-fetes)" />
    </svg>
  );
}

/** Petite étoile posée près du logo, sans toucher au logo lui-même. */
export function EtoileLogo() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="pointer-events-none absolute -right-3 -top-1 size-4"
    >
      <Etoile x={8} y={8.5} r={7.5} couleur="var(--festif-or)" />
    </svg>
  );
}
