import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Banner } from "@/lib/db/types";

export async function getAllBanners(): Promise<Banner[]> {
  const db = await getDrizzle();
  return db.select().from(banners).orderBy(asc(banners.display_order)) as unknown as Banner[];
}

export async function getBannerById(id: number): Promise<Banner | undefined> {
  const db = await getDrizzle();
  const rows = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  return rows[0] as unknown as Banner | undefined;
}
