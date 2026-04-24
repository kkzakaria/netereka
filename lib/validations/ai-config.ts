import { z } from "zod";

// Allow:
//   - empty/null (means "no change" / "clear")
//   - mask-shape (••••••••... — server-side compares to existing mask exactly)
//   - real Anthropic key (sk-ant-...)
// Reject:
//   - random non-Anthropic strings (cheap typo guard before the API call)
const isMaskShape = (v: string) => v.startsWith("••");
const isAnthropicKey = (v: string) => v.startsWith("sk-ant-");

export const aiConfigSchema = z.object({
  anthropic_api_key: z
    .string()
    .trim()
    .max(500, "Clé API trop longue (max 500 caractères)")
    .refine(
      (v) => !v || isMaskShape(v) || isAnthropicKey(v),
      { message: "La clé Anthropic doit commencer par sk-ant-" },
    )
    .nullable(),
  model: z
    .string()
    .trim()
    .max(100, "Nom de modèle trop long (max 100 caractères)")
    .nullable(),
  enabled: z.boolean(),
});

export type AiConfigInput = z.infer<typeof aiConfigSchema>;
