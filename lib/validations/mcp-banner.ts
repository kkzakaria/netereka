import { z } from "zod";
import { changeReasonSchema } from "@/lib/validations/mcp-common";

/**
 * Contrats d'entrée des outils MCP de bannières (lib/mcp/tools/banners.ts).
 * Les règles reprennent celles de l'écran d'administration
 * (actions/admin/banners.ts) : le MCP ne doit pas pouvoir écrire une
 * bannière que l'interface refuserait.
 *
 * `image_url` est absent à dessein : c'est une clé R2, et un outil qui
 * accepterait une chaîne libre y poserait une URL quelconque. Les images de
 * bannière relèvent de la phase images.
 */

/** Borne haute alignée sur MAX_INPUT_LENGTH de sanitizeDescriptionHtml. */
const CONTENT_HTML_MAX = 512_000;

const linkUrl = z.string().min(1).max(500).refine((v) => v.startsWith("/"), "Le lien doit être un chemin relatif (ex: /p/produit)");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #rrggbb)");
const dateTime = z.string().trim().min(1).max(32);

const bannerFields = {
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().max(500).nullable(),
  badge_text: z.string().max(50).nullable(),
  badge_color: z.enum(["mint", "red", "orange", "blue"]),
  link_url: linkUrl,
  cta_text: z.string().min(1).max(50),
  price: z.number().int().min(0).nullable(),
  bg_gradient_from: hex,
  bg_gradient_to: hex,
  content_html: z.string().max(CONTENT_HTML_MAX).nullable(),
  starts_at: dateTime.nullable(),
  ends_at: dateTime.nullable(),
};

function datesInOrder(d: { starts_at?: string | null; ends_at?: string | null }): boolean {
  return !(d.starts_at && d.ends_at) || d.starts_at < d.ends_at;
}
const DATES_MESSAGE = "La date de fin doit être postérieure à la date de début";

export const bannerIdSchema = z.number().int().positive();

/** Champs modifiables d'une bannière existante, tous optionnels ; `null`
 *  efface les champs qui l'admettent. `is_active` n'en fait plus partie
 *  (§ 2.6) : activer relève de `create_banner`, retirer de `withdraw_banner`. */
export const updateBannerShape = {
  id: bannerIdSchema,
  reason: changeReasonSchema,
  title: bannerFields.title.optional(),
  subtitle: bannerFields.subtitle.optional(),
  badge_text: bannerFields.badge_text.optional(),
  badge_color: bannerFields.badge_color.optional(),
  link_url: bannerFields.link_url.optional(),
  cta_text: bannerFields.cta_text.optional(),
  price: bannerFields.price.optional(),
  bg_gradient_from: bannerFields.bg_gradient_from.optional(),
  bg_gradient_to: bannerFields.bg_gradient_to.optional(),
  content_html: bannerFields.content_html.optional(),
  display_order: z.number().int().min(0).optional(),
  starts_at: bannerFields.starts_at.optional(),
  ends_at: bannerFields.ends_at.optional(),
};

export const createBannerShape = {
  title: bannerFields.title,
  link_url: bannerFields.link_url,
  subtitle: bannerFields.subtitle.optional(),
  badge_text: bannerFields.badge_text.optional(),
  badge_color: bannerFields.badge_color.optional(),
  cta_text: bannerFields.cta_text.optional(),
  price: bannerFields.price.optional(),
  bg_gradient_from: bannerFields.bg_gradient_from.optional(),
  bg_gradient_to: bannerFields.bg_gradient_to.optional(),
  content_html: bannerFields.content_html.optional(),
  starts_at: bannerFields.starts_at.optional(),
  ends_at: bannerFields.ends_at.optional(),
};

/** Contrôle croisé que la forme brute (celle que le SDK valide) ne porte pas. */
export function checkBannerDates(d: { starts_at?: string | null; ends_at?: string | null }): string | null {
  return datesInOrder(d) ? null : DATES_MESSAGE;
}
