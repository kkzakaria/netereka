import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

/**
 * JSON Schema for the `submit_product` tool input.
 *
 * Mirrors `aiProductOutputSchema` (success) and `aiNotFoundSchema` (not_found)
 * from `lib/validations/product-ai.ts`. Anthropic uses this to constrain the
 * model's tool-call output, which dramatically reduces shape drift (e.g. the
 * model emitting `image_candidates` as strings instead of objects, or putting
 * `tagline`/`highlights` at the top level instead of nested under `story`).
 *
 * Two variants via `oneOf`:
 *  - `not_found: true` + `reason` only — when the product can't be identified.
 *  - Full product fiche with required `name`, `category_suggestion`, `image_candidates`.
 *
 * The Zod parser in `parseAiToolInput()` is the runtime safety net; this schema
 * is the upstream constraint. They MUST stay in sync — there is no automated
 * equivalence check between the two. When changing one, change the other and
 * update `__tests__/unit/ai/submit-tool-schema.test.ts` (verify the canonical
 * `validOutput` fixture still passes both).
 */
export const SUBMIT_PRODUCT_TOOL_SCHEMA = {
  type: "object" as const,
  oneOf: [
    {
      title: "ProductNotFound",
      type: "object",
      required: ["not_found", "reason"],
      additionalProperties: false,
      properties: {
        not_found: { type: "boolean", const: true },
        reason: {
          type: "string",
          maxLength: 300,
          description: "Pourquoi le produit est introuvable ou ambigu.",
        },
      },
    },
    {
      title: "ProductSubmission",
      type: "object",
      required: ["name", "category_suggestion", "image_candidates"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1, maxLength: 150 },
        brand: { type: "string", maxLength: 80 },
        category_suggestion: {
          type: "string",
          minLength: 1,
          description: "Catégorie suggérée (ex: smartphones, ordinateurs portables, audio).",
        },
        short_description: {
          type: "string",
          maxLength: 120,
          description: "Résumé court (≤120 caractères). Pas une description complète.",
        },
        description_html: {
          type: "string",
          description: "Description longue en HTML simple (<p>, <ul>, <li>).",
        },
        attributes: {
          type: "object",
          additionalProperties: false,
          properties: {
            colors: {
              type: "array",
              maxItems: 12,
              items: {
                type: "object",
                required: ["name", "hex"],
                additionalProperties: false,
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 40 },
                  hex: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                },
              },
            },
            dimensions: {
              type: "object",
              additionalProperties: false,
              properties: {
                length_mm: { type: "integer", exclusiveMinimum: 0 },
                height_mm: { type: "integer", exclusiveMinimum: 0 },
                width_mm: { type: "integer", exclusiveMinimum: 0 },
                weight_g: { type: "integer", exclusiveMinimum: 0 },
              },
            },
            specs: {
              type: "array",
              maxItems: 20,
              items: {
                type: "object",
                required: ["name", "value"],
                additionalProperties: false,
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 60 },
                  value: { type: "string", minLength: 1, maxLength: 200 },
                },
              },
            },
          },
        },
        story: {
          type: "object",
          additionalProperties: false,
          properties: {
            tagline: { type: "string", maxLength: 200 },
            highlights: {
              type: "array",
              minItems: 3,
              maxItems: 6,
              items: {
                type: "object",
                required: ["icon", "label"],
                additionalProperties: false,
                properties: {
                  icon: { type: "string", enum: [...HIGHLIGHT_ICON_NAMES] },
                  label: { type: "string", minLength: 1, maxLength: 80 },
                },
              },
            },
            feature_blocks: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                required: ["title", "body"],
                additionalProperties: false,
                properties: {
                  title: { type: "string", minLength: 1, maxLength: 120 },
                  body: { type: "string", minLength: 1, maxLength: 600 },
                },
              },
            },
            faq: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                required: ["question", "answer"],
                additionalProperties: false,
                properties: {
                  question: { type: "string", minLength: 1, maxLength: 160 },
                  answer: { type: "string", minLength: 1, maxLength: 600 },
                },
              },
            },
          },
        },
        seo: {
          type: "object",
          additionalProperties: false,
          properties: {
            meta_title: { type: "string", maxLength: 60 },
            meta_description: { type: "string", maxLength: 160 },
          },
        },
        image_candidates: {
          type: "array",
          minItems: 1,
          maxItems: 12,
          description:
            "Tableau d'OBJETS — chaque image est { url, source_domain, alt? }. Pas de strings nues.",
          items: {
            type: "object",
            required: ["url", "source_domain"],
            additionalProperties: false,
            properties: {
              url: {
                type: "string",
                format: "uri",
                description: "URL absolue d'image directe (jpg/png/webp).",
              },
              source_domain: { type: "string", minLength: 1 },
              alt: { type: "string", maxLength: 200 },
            },
          },
        },
        // Discriminator: keeps the two oneOf branches mutually exclusive even if
        // `name`/`category_suggestion`/`image_candidates` are ever made optional.
        not_found: {
          type: "boolean",
          const: false,
          description: "Omettre, ou false, pour soumettre une fiche.",
        },
      },
    },
  ],
};
