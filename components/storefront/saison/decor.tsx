import type { CSSProperties } from "react";

/**
 * Décor des fêtes : SVG en ligne, sans image raster, pour ne rien coûter au
 * chargement mobile. Purement décoratifs, donc masqués aux lecteurs d'écran.
 * Les couleurs viennent des tokens `--festif-*`, qui n'existent que sous
 * `[data-saison="fetes"]`.
 *
 * Le scintillement est une animation CSS (`.festif-scintille`, dans
 * `app/globals.css`) : opacité et échelle seulement, coupée par
 * `prefers-reduced-motion`. Jamais de SMIL (`<animate>`), que ce réglage ne
 * peut pas arrêter.
 */

/** Période du scintillement, en secondes : à garder égale à celle du CSS. */
const PERIODE = 2.4;
/** Décalage entre deux étoiles voisines : la lumière court vers la droite. */
const DECALAGE = 0.18;
/** Écart entre deux étoiles d'or (une rouge entre elles). */
const PAS = 48;
/** De quoi couvrir un écran 4K (3840 px) : 80 × 48 = 3840. */
const NB_MOTIFS = 80;

function Etoile({
  x,
  y,
  r,
  couleur,
  delai,
}: {
  x: number;
  y: number;
  r: number;
  couleur: string;
  delai?: number;
}) {
  // Étoile à cinq branches centrée sur (x, y).
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rayon = i % 2 === 0 ? r : r * 0.45;
    return `${(x + rayon * Math.cos(angle)).toFixed(2)},${(y + rayon * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  const style: CSSProperties | undefined =
    delai === undefined ? undefined : { animationDelay: `${delai}s` };
  return <polygon points={points} fill={couleur} className="festif-scintille" style={style} />;
}

/** Délai négatif : chaque étoile démarre déjà en cours de cycle, sans attente. */
function delaiPour(rang: number): number {
  return -Number(((rang * DECALAGE) % PERIODE).toFixed(2));
}

/**
 * Guirlande d'étoiles en pleine largeur, posée sur le bord bas de l'en-tête.
 * Le fil reste un motif répété ; les étoiles sont posées une à une, parce
 * qu'un motif SVG ne peut pas donner à chaque tuile son propre décalage.
 * Le SVG coupe ce qui dépasse la largeur de l'écran.
 */
export function GuirlandeEtoiles() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-0 -bottom-[7px] h-3 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="guirlande-fetes" width={PAS} height="12" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q12 9 24 3 T48 3" fill="none" stroke="currentColor" strokeOpacity="0.25" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill="url(#guirlande-fetes)" />
      {Array.from({ length: NB_MOTIFS }, (_, i) => (
        <g key={i}>
          <Etoile x={i * PAS + 12} y={6.5} r={4} couleur="var(--festif-or)" delai={delaiPour(2 * i)} />
          <Etoile x={i * PAS + 36} y={6.5} r={3} couleur="var(--festif-rouge)" delai={delaiPour(2 * i + 1)} />
        </g>
      ))}
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
