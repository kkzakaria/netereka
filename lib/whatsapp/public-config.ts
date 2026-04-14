import { cache } from "react";
import { getDB } from "@/lib/cloudflare/context";

/**
 * Read the public-facing WhatsApp number (for wa.me links) from whatsapp_config.
 * Returns null if WhatsApp is not configured or inactive.
 * Cached per-request via React's cache().
 */
export const getPublicWhatsAppNumber = cache(async (): Promise<string | null> => {
  try {
    const db = await getDB();
    const row = await db
      .prepare("SELECT display_phone_number, is_active FROM whatsapp_config WHERE id = 1")
      .first<{ display_phone_number: string | null; is_active: number }>();

    if (!row || !row.is_active || !row.display_phone_number) return null;

    // Defensive normalization: digits only (DB should already store normalized values)
    const digits = row.display_phone_number.replace(/\D/g, "");
    return /^\d{8,15}$/.test(digits) ? digits : null;
  } catch (error) {
    console.error("[whatsapp/public-config] Failed to read display number:", error);
    return null;
  }
});
