import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { SITE_URL } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticLastModified = new Date("2026-02-01");

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/a-propos`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/livraison`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/conditions-generales`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const [categories, products] = await Promise.all([
    query<{ slug: string; updated_at: string }>(
      "SELECT slug, updated_at FROM categories WHERE is_active = 1"
    ),
    query<{ slug: string; updated_at: string }>(
      "SELECT slug, updated_at FROM products WHERE is_active = 1"
    ),
  ]);

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/c/${cat.slug}`,
    lastModified: new Date(cat.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/p/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
