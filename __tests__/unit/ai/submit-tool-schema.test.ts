import { describe, expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { SUBMIT_PRODUCT_TOOL_SCHEMA } from "@/lib/ai/submit-tool-schema";

/**
 * The JSON Schema we hand to Anthropic constrains Claude's tool-call output.
 * These tests pin the schema's behavior on the two payloads that motivated
 * its existence:
 *   - the canonical fixture from `product-research.test.ts` MUST pass
 *   - the MacBook payload that triggered the production bug MUST fail
 *     (top-level `category` instead of `category_suggestion`, top-level
 *     `tagline`/`highlights`/`feature_blocks` instead of nested under `story`,
 *     `image_candidates` as strings instead of objects).
 */

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(SUBMIT_PRODUCT_TOOL_SCHEMA);

const validOutput = {
  name: "Galaxy A55",
  category_suggestion: "smartphones",
  attributes: { colors: [], dimensions: {}, specs: [] },
  story: {},
  seo: {},
  image_candidates: [{ url: "https://x.test/a.jpg", source_domain: "x.test" }],
};

// Reduced reproduction of the MacBook payload that hit prod (truncated body
// fields — the schema violations we test for don't depend on length).
const macbookPayload = {
  brand: "Apple",
  name: "MacBook Pro M5",
  category: "Ordinateur portable",
  tagline: "La puissance Pro. Décuplée par l'IA.",
  short_description:
    "Le MacBook Pro animé par la nouvelle puce Apple M5 propulse vos workflows créatifs et IA grâce à un GPU de nouvelle génération doté d'un Neural Accelerator dans chaque cœur, jusqu'à 24 heures d'autonomie.",
  long_description: "Apple repousse une nouvelle fois les limites…",
  highlights: [
    { icon: "cpu", title: "Puce Apple M5", text: "CPU 10 cœurs." },
    { icon: "sparkle", title: "IA jusqu'à 3,5× plus rapide", text: "Neural Accelerator." },
    { icon: "display", title: "Liquid Retina XDR", text: "3024 × 1964 px." },
  ],
  feature_blocks: [
    { title: "Conçu pour l'IA", body: "M5 + Neural Accelerator." },
    { title: "Endurance pro", body: "24 h d'autonomie." },
  ],
  image_candidates: [
    "https://www.apple.com/m5.jpg",
    "https://www.apple.com/m5-side.jpg",
    "https://www.apple.com/m5-back.jpg",
  ],
};

describe("SUBMIT_PRODUCT_TOOL_SCHEMA", () => {
  it("accepte le fixture canonique validOutput", () => {
    const ok = validate(validOutput);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("accepte un payload not_found", () => {
    const ok = validate({ not_found: true, reason: "produit ambigu" });
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("rejette le payload MacBook (champs au mauvais niveau, strings au lieu d'objets pour image_candidates)", () => {
    const ok = validate(macbookPayload);
    expect(ok).toBe(false);
    const errors = validate.errors ?? [];

    // image_candidates: chaque string échoue avec instancePath /image_candidates/N et keyword "type" (object)
    const stringImageErrors = errors.filter(
      (e) => /^\/image_candidates\/\d+$/.test(e.instancePath) && e.keyword === "type",
    );
    expect(stringImageErrors.length).toBeGreaterThanOrEqual(3);

    // category_suggestion manquant ou propriété "category" non autorisée — au moins un de ces signaux
    // doit ressortir d'au moins une branche de oneOf.
    const flagsCategoryIssue = errors.some(
      (e) =>
        (e.keyword === "required" && (e.params as { missingProperty?: string }).missingProperty === "category_suggestion") ||
        (e.keyword === "additionalProperties" && (e.params as { additionalProperty?: string }).additionalProperty === "category"),
    );
    expect(flagsCategoryIssue).toBe(true);

    // additionalProperties: tagline / highlights / feature_blocks / long_description au top-level ne sont pas autorisés
    const flagsTopLevelLeak = errors.some(
      (e) =>
        e.keyword === "additionalProperties" &&
        ["tagline", "highlights", "feature_blocks", "long_description"].includes(
          (e.params as { additionalProperty?: string }).additionalProperty ?? "",
        ),
    );
    expect(flagsTopLevelLeak).toBe(true);
  });

  it("rejette short_description > 120 caractères", () => {
    const ok = validate({
      ...validOutput,
      short_description: "x".repeat(121),
    });
    expect(ok).toBe(false);
    expect(
      (validate.errors ?? []).some(
        (e) => e.instancePath === "/short_description" && e.keyword === "maxLength",
      ),
    ).toBe(true);
  });

  it("rejette image_candidates avec une URL non valide", () => {
    const ok = validate({
      ...validOutput,
      image_candidates: [{ url: "pas-une-url", source_domain: "x.test" }],
    });
    expect(ok).toBe(false);
    expect(
      (validate.errors ?? []).some(
        (e) => e.instancePath === "/image_candidates/0/url" && e.keyword === "format",
      ),
    ).toBe(true);
  });
});
