import { getDrizzle } from "@/lib/db/drizzle";
import { stores } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { cache } from "react";

export interface ActiveStore {
  id: string;
  name: string;
  address: string;
  google_maps_url: string;
  phone: string | null;
}

// React-cached: the storefront header and the home page's store JSON-LD both
// read it in the same request — one D1 query, not two.
export const getActiveStores = cache(async function getActiveStores(): Promise<ActiveStore[]> {
  const db = await getDrizzle();
  return db
    .select({
      id: stores.id,
      name: stores.name,
      address: stores.address,
      google_maps_url: stores.google_maps_url,
      phone: stores.phone,
    })
    .from(stores)
    .where(eq(stores.is_active, 1))
    .orderBy(asc(stores.sort_order)) as unknown as ActiveStore[];
});
