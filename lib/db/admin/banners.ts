import { getDrizzle } from "@/lib/db/drizzle";
import { banners, bannerGradients } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Banner, BannerGradient } from "@/lib/db/types";
import { sanitizeBannerContent } from "@/lib/db/storefront/banners";

export async function getAllBanners(): Promise<Banner[]> {
  const db = await getDrizzle();
  const rows = (await db
    .select()
    .from(banners)
    .orderBy(asc(banners.display_order))) as unknown as Banner[];
  return sanitizeBannerContent(rows);
}

export async function getBannerById(id: number): Promise<Banner | undefined> {
  const db = await getDrizzle();
  const rows = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  const row = rows[0] as unknown as Banner | undefined;
  return row && sanitizeBannerContent([row])[0];
}

export async function getSavedGradients(): Promise<BannerGradient[]> {
  const db = await getDrizzle();
  return db.select().from(bannerGradients).orderBy(asc(bannerGradients.id)).limit(50) as unknown as BannerGradient[];
}
