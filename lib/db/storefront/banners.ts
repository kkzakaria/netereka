import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { eq, and, or, isNull, lte, gt, asc } from "drizzle-orm";
import type { Banner } from "@/lib/db/types";

export async function getActiveBanners(): Promise<Banner[]> {
  const db = await getDrizzle();
  const now = new Date().toISOString();

  return db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.is_active, 1),
        or(isNull(banners.starts_at), lte(banners.starts_at, now)),
        or(isNull(banners.ends_at), gt(banners.ends_at, now))
      )
    )
    .orderBy(asc(banners.display_order)) as unknown as Banner[];
}
