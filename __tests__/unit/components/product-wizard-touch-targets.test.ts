// __tests__/unit/components/product-wizard-touch-targets.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Le design system NETEREKA impose une cible tactile minimale de 44 px (CLAUDE.md).
 * Les tailles `touch` / `icon-touch` du composant Button valent h-11 / size-11 (44 px).
 * Ce test verrouille la correction de l'issue #147 : tous les boutons de
 * step-variants.tsx doivent partir d'une taille conforme, la densité desktop
 * étant restaurée via les overrides `sm:` (motif de app/(admin)/products/page.tsx).
 */
const SOURCE = readFileSync(
  resolve(__dirname, "../../..", "components/admin/product-wizard/step-variants.tsx"),
  "utf8",
);

const BUTTON_SIZE_RE = /<Button\b[^>]*?\bsize="([^"]+)"/g;
const TOUCH_SIZES = ["touch", "icon-touch"];

/**
 * Vrai pour une classe de dimension non préfixée qui rendrait le bouton plus court
 * que 44 px. Décide sur la valeur plutôt que sur une énumération : une liste figée
 * (`h-0`…`h-10`) laissait passer `size-10` — la famille même qui pilote les boutons
 * icônes — et les valeurs arbitraires comme `h-[40px]`.
 */
function isSubTouch(token: string): boolean {
  const match = /^(?:h|size)-(.+)$/.exec(token);
  if (!match) return false;
  const value = match[1];
  // Échelle Tailwind : 1 unité = 4 px, donc 44 px = 11.
  if (/^\d+(?:\.\d+)?$/.test(value)) return parseFloat(value) * 4 < 44;
  const arbitraryPx = /^\[(\d+(?:\.\d+)?)px\]$/.exec(value);
  if (arbitraryPx) return parseFloat(arbitraryPx[1]) < 44;
  // rem, %, calc()… non décidables statiquement : hors périmètre de ce garde.
  return false;
}

describe("step-variants — cibles tactiles 44 px (#147)", () => {
  it("déclare une taille explicite sur chaque <Button>", () => {
    const buttonCount = (SOURCE.match(/<Button\b/g) ?? []).length;
    const sized = [...SOURCE.matchAll(BUTTON_SIZE_RE)];
    expect(buttonCount).toBeGreaterThan(0);
    expect(sized).toHaveLength(buttonCount);
  });

  it("utilise uniquement des tailles conformes (touch / icon-touch)", () => {
    const sizes = [...SOURCE.matchAll(BUTTON_SIZE_RE)].map((m) => m[1]);
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(TOUCH_SIZES).toContain(size);
    }
  });

  it("ne réintroduit pas de hauteur sous 44 px en mobile", () => {
    // Les overrides de hauteur ne sont tolérés que derrière un breakpoint (sm:, md:…)
    const classNames = [...SOURCE.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
    const subTouch = classNames
      .flatMap((cls) => cls.split(/\s+/))
      .filter(isSubTouch);
    expect(subTouch).toEqual([]);
  });
});
