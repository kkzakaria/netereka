import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/constants";

/**
 * Robots that collect content to TRAIN models: blocked.
 *
 * Search/citation robots — `OAI-SearchBot` (ChatGPT search), `PerplexityBot`,
 * `Claude-SearchBot` — are deliberately NOT here (decision of 2026-11-22,
 * SEO audit in docs/seo/): blocking them kept NETEREKA out of the answers
 * those assistants give to "where to buy X in Abidjan", an audience channel,
 * while their content is used for answering with a link, not for training.
 * Not listed, they fall under the `*` group, so the private paths stay closed
 * to them too. Allowing them guarantees nothing — it is only a precondition.
 */
const AI_TRAINING_BOTS = [
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "Google-Extended",
  "GPTBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/auth/",
        ],
      },
      ...AI_TRAINING_BOTS.map((bot) => ({ userAgent: bot, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
