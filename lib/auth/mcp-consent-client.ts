import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { oauthApplication, verification } from "@/lib/db/schema";

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

export interface ConsentRequest {
  clientId: string;
  clientName: string | null;
  redirectHost: string;
  scopes: string[];
}

/** Shape of `verification.value` for a consent-flow row, per
 * node_modules/better-auth/dist/plugins/mcp/authorize.mjs. Untrusted beyond
 * `clientId`/`redirectURI`/`scope`/`requireConsent`, which is all we read. */
interface StoredConsentValue {
  clientId: string;
  redirectURI: string;
  scope: string[];
  requireConsent: boolean;
}

/**
 * Resolves the pending consent request identified by `consent_code` (the
 * query param better-auth's oidc-provider redirects the admin with — see
 * node_modules/better-auth/dist/plugins/mcp/authorize.mjs:130-136) directly
 * from the `verification` table, rather than trusting the `client_id` in the
 * query string. Returns null when the code is missing, expired, unparsable,
 * or does not require consent — the caller must treat that as "unknown
 * request" and never fall back to displaying the query string's client_id.
 */
export async function findConsentRequest(code: string): Promise<ConsentRequest | null> {
  const db = await getDrizzle();
  const row = await db
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, code))
    .get();
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  let value: StoredConsentValue;
  try {
    value = JSON.parse(row.value) as StoredConsentValue;
  } catch {
    return null;
  }
  if (value.requireConsent !== true) return null;

  let redirectHost: string;
  try {
    redirectHost = new URL(value.redirectURI).host;
  } catch {
    return null;
  }

  const clientName = await findOAuthClientName(value.clientId);
  return {
    clientId: value.clientId,
    clientName,
    redirectHost,
    scopes: Array.isArray(value.scope) ? value.scope : [],
  };
}
