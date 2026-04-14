import { cache } from "react";
import { getDB } from "@/lib/cloudflare/context";

/**
 * Read the public-facing WhatsApp number (for wa.me links) from whatsapp_config.
 *
 * NOTE: This is independent of `is_active` — the public number only drives the
 * storefront wa.me buttons, which should work even when the bot is disabled.
 * The `is_active` flag gates the bot API integration, not the display number.
 *
 * Returns null if no number is configured or the stored value is malformed.
 * Cached per-request via React's cache().
 */
export const getPublicWhatsAppNumber = cache(async (): Promise<string | null> => {
  try {
    const db = await getDB();
    const row = await db
      .prepare("SELECT display_phone_number FROM whatsapp_config WHERE id = 1")
      .first<{ display_phone_number: string | null }>();

    if (!row || !row.display_phone_number) return null;

    // Defensive normalization: digits only (DB should already store normalized values)
    const digits = row.display_phone_number.replace(/\D/g, "");
    return /^\d{8,15}$/.test(digits) ? digits : null;
  } catch (error) {
    console.error("[whatsapp/public-config] Failed to read display number:", error);
    return null;
  }
});
