import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { user } from "@/lib/db/schema";
import { isActivelyBanned } from "@/lib/auth/ban";

export interface McpContext {
  user: { id: string; name: string; role: "admin" | "super_admin" };
  clientId: string;
}

/** Thrown before any tool runs; the route turns it into a JSON-RPC 403. */
export class McpAuthError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}

/**
 * The OAuth token proves "some user consented"; this is the authorization
 * boundary. Fresh D1 read on every request (same spirit as requireAdmin's
 * disableCookieCache) so a role change or ban applies immediately.
 */
export async function buildMcpContext(session: { userId?: string | null; clientId: string }): Promise<McpContext> {
  if (!session.userId) throw new McpAuthError("Jeton sans utilisateur");
  const db = await getDrizzle();
  const row = await db
    .select({ id: user.id, name: user.name, role: user.role, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1)
    .get();
  if (!row) throw new McpAuthError("Utilisateur introuvable");
  if (isActivelyBanned(row)) throw new McpAuthError("Compte suspendu");
  if (row.role !== "admin" && row.role !== "super_admin") throw new McpAuthError("Accès réservé aux administrateurs");
  return { user: { id: row.id, name: row.name, role: row.role }, clientId: session.clientId };
}
