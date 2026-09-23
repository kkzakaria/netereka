import { z } from "zod";

// Two-tier config (see CLAUDE.md § WhatsApp Integration):
//   - display_phone_number is PUBLIC: it drives the storefront wa.me buttons and
//     works independently of is_active. It is never required.
//   - the five API fields are required ONLY when is_active is true, to switch the
//     conversational bot on.
export const WHATSAPP_API_FIELDS = [
  "phone_number_id",
  "access_token",
  "verify_token",
  "webhook_secret",
  "business_account_id",
] as const;

const API_FIELD_LABELS: Record<(typeof WHATSAPP_API_FIELDS)[number], string> = {
  phone_number_id: "Le Phone Number ID",
  access_token: "L'Access Token",
  verify_token: "Le Verify Token",
  webhook_secret: "Le Webhook Secret",
  business_account_id: "Le Business Account ID",
};

export const DISPLAY_PHONE_ERROR =
  "Le numéro public doit contenir entre 8 et 15 chiffres (format international, ex: 2250700000001).";
export const ADMIN_PHONES_ERROR = "admin_phones doit être un tableau JSON valide.";

function isJsonArray(value: string): boolean {
  if (value === "") return true;
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

// Secrets are deliberately unconstrained in shape: the form pre-fills them with
// the mask (•••••••• + last 4), and a real secret may legitimately start with
// bullets too. Distinguishing "unchanged" from "new value" needs the stored
// value, so it happens server-side in saveWhatsAppConfig via an EXACT mask
// comparison — never a startsWith("••") guess.
export const whatsappConfigSchema = z
  .object({
    display_phone_number: z
      .string()
      // Normalize: keep digits only (strips +, spaces, dashes, dots)
      .transform((v) => v.trim().replace(/\D/g, ""))
      // E.164-ish: 8-15 digits (ITU-T E.164 max is 15)
      .refine((v) => v === "" || /^\d{8,15}$/.test(v), DISPLAY_PHONE_ERROR),
    phone_number_id: z.string().trim(),
    business_account_id: z.string().trim(),
    access_token: z.string().trim(),
    verify_token: z.string().trim(),
    webhook_secret: z.string().trim(),
    admin_phones: z
      .string()
      .transform((v) => v.trim())
      .refine(isJsonArray, ADMIN_PHONES_ERROR)
      .transform((v) => (v === "" ? "[]" : JSON.stringify(JSON.parse(v) as unknown[]))),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_active) return;
    for (const field of WHATSAPP_API_FIELDS) {
      if (data[field] === "") {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${API_FIELD_LABELS[field]} est requis pour activer le bot.`,
        });
      }
    }
  });

export type WhatsAppConfigInput = z.input<typeof whatsappConfigSchema>;
export type WhatsAppConfigValues = z.infer<typeof whatsappConfigSchema>;
