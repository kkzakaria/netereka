import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { oauthApplication } from "@/lib/db/schema";

/** Name a dynamically-registered MCP client gave itself. Untrusted: render escaped. */
export async function findOAuthClientName(clientId: string): Promise<string | null> {
  const db = await getDrizzle();
  // No .limit(1): clientId is unique in the schema, so the filter already
  // returns at most one row — and drizzle-orm/d1 binds LIMIT as a query
  // parameter, which would break the ["client-1"] params assertion below.
  const row = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .get();
  return row?.name ?? null;
}
