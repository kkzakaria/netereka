const chevronLeft = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

const chevronRight = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export function ScrollButtons({
  canScrollLeft,
  canScrollRight,
  onScroll,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (direction: "left" | "right") => void;
}) {
  return (
    <>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => onScroll("left")}
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md ring-1 ring-border backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background sm:block"
          aria-label="Défiler à gauche"
        >
          {chevronLeft}
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => onScroll("right")}
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md ring-1 ring-border backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background sm:block"
          aria-label="Défiler à droite"
        >
          {chevronRight}
        </button>
      )}
    </>
  );
}
