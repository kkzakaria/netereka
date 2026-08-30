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
      .filter((token) => /^h-(?:[0-9]|10)$/.test(token));
    expect(subTouch).toEqual([]);
  });
});
