import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PII_PAGES = [
  "app/(admin)/dashboard/page.tsx",
  "app/(admin)/orders/page.tsx",
  "app/(admin)/orders/[id]/page.tsx",
  "app/(admin)/orders/[id]/invoice/page.tsx",
  "app/(admin)/customers/page.tsx",
  // La révision appliquée depuis cet écran écrit sur une fiche ou une
  // bannière EN LIGNE (lib/db/revisions.ts, applyRevision) : un accès non
  // gardé permettrait de publier du contenu sur la vitrine sans passer par
  // requireAdmin().
  "app/(admin)/revisions/[id]/page.tsx",
];

describe("admin pages exposing customer data", () => {
  it.each(PII_PAGES)("%s calls requireAdmin()", (page) => {
    const source = readFileSync(resolve(__dirname, "../..", page), "utf8");
    expect(source).toMatch(/requireAdmin\s*\(/);
  });
});
