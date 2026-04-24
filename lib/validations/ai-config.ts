import { z } from "zod";

export const aiConfigSchema = z.object({
  anthropic_api_key: z
    .string()
    .trim()
    .max(500, "Clé API trop longue (max 500 caractères)")
    .optional()
    .nullable(),
  model: z
    .string()
    .trim()
    .max(100, "Nom de modèle trop long (max 100 caractères)")
    .optional()
    .nullable(),
  enabled: z.boolean(),
});

export type AiConfigInput = z.infer<typeof aiConfigSchema>;
