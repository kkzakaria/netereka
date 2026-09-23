// __tests__/unit/components/whatsapp-config-form-a11y.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `aria-invalid` fait annoncer « champ invalide » par un lecteur d'écran, mais pas
 * le motif : sans relation explicite, le message d'erreur et l'indication de format
 * restent inaudibles. Ce test verrouille le câblage `aria-describedby` du formulaire
 * de configuration WhatsApp — l'oubli sur un champ ajouté plus tard serait invisible
 * à la relecture comme à l'exécution.
 *
 * L'inspection porte sur la source : la suite tourne en environnement `node`, sans
 * jsdom ni Testing Library (voir vitest.config.ts). Même motif que
 * __tests__/unit/admin-page-guards.test.ts.
 */
const SOURCE = readFileSync(
  resolve(__dirname, "../../..", "components/admin/whatsapp/whatsapp-config-form.tsx"),
  "utf8",
);

/** Tout champ qui se déclare invalide doit dire pourquoi. */
const INVALID_RE = /aria-invalid=\{!!errors\.(\w+)\}/g;

describe("whatsapp-config-form — accessibilité des messages de validation", () => {
  const fields = [...SOURCE.matchAll(INVALID_RE)].map((m) => m[1]);

  it("déclare au moins un champ validé", () => {
    expect(fields.length).toBeGreaterThan(0);
  });

  it.each(fields)("%s associe son message d'erreur à l'input", (field) => {
    expect(SOURCE).toContain(`aria-describedby={fieldDescribedBy("${field}", errors.${field},`);
    expect(SOURCE).toContain(`<p id="${field}-error"`);
  });

  it("associe chaque indication de format déclarée à son input", () => {
    // Un id `-hint` n'est annoncé que si le champ passe `true` à fieldDescribedBy.
    const hintIds = [...SOURCE.matchAll(/<p id="(\w+)-hint"/g)].map((m) => m[1]);
    for (const field of hintIds) {
      expect(SOURCE).toContain(`fieldDescribedBy("${field}", errors.${field}, true)`);
    }
    // Réciproquement, aucun champ ne doit promettre une aide qui n'existe pas.
    const promised = [...SOURCE.matchAll(/fieldDescribedBy\("(\w+)", errors\.\w+, true\)/g)].map((m) => m[1]);
    expect(promised.sort()).toEqual(hintIds.sort());
  });
});
