import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/constants";

const AI_BOTS = [
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "Google-Extended",
  "GPTBot",
  "meta-externalagent",
  "OAI-SearchBot",
  "PerplexityBot",
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
      ...AI_BOTS.map((bot) => ({ userAgent: bot, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
