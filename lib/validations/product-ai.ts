import { z } from "zod";

/**
 * Admin-typed prompt for AI product generation.
 * Trim → reject control chars → length bounds. 3–200 chars feels natural
 * for product names (brand + model + capacity).
 */
export const aiPromptSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), {
    message: "Caractères de contrôle interdits",
  })
  .refine((v) => v.length >= 3, { message: "Prompt trop court (min 3 caractères)" })
  .refine((v) => v.length <= 200, { message: "Prompt trop long (max 200 caractères)" });
