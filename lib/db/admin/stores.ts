import { getDrizzle } from "@/lib/db/drizzle";
import { stores } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Store } from "@/lib/db/types";

export async function getAllStores(): Promise<Store[]> {
  const db = await getDrizzle();
  return db
    .select()
    .from(stores)
    .orderBy(asc(stores.sort_order)) as unknown as Store[];
}

export async function getStoreById(
  id: string
): Promise<Store | undefined> {
  const db = await getDrizzle();
  const rows = await db
    .select()
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);
  return rows[0] as unknown as Store | undefined;
}
