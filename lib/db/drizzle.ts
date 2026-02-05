import { drizzle } from "drizzle-orm/d1";
import { getDB } from "@/lib/cloudflare/context";
import * as schema from "./schema";

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export async function getDrizzle(): Promise<DrizzleDB> {
  const d1 = await getDB();
  return drizzle(d1, { schema });
}
