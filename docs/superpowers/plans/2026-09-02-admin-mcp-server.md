# Admin MCP Server (phase 1, product drafts) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a remote, OAuth-protected MCP server inside the Next.js app so any MCP client can create and edit product drafts on behalf of an admin.

**Architecture:** `POST /api/mcp` is guarded by better-auth's `mcp` plugin (OAuth 2.1, dynamic client registration, forced consent page). Each request builds a fresh stateless `McpServer` from the official SDK, checks the token's user is an active admin, and serves tools that delegate to a new Drizzle module `lib/db/product-drafts.ts` whose every write carries `is_draft = 1`. Existing helpers (`fetchAndUploadImage`, `sanitizeDescriptionHtml`, `slugify`, `getCategoryTree`, `createAuditLog`) are reused, not modified.

**Tech Stack:** Next.js 16 App Router on Cloudflare Workers (OpenNext), better-auth 1.6.25 (`mcp` plugin), `@modelcontextprotocol/sdk` 1.30 (`WebStandardStreamableHTTPServerTransport`), Drizzle ORM on D1, R2, Zod 4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md`

## Global Constraints

- All new DB code uses `getDrizzle()` from `lib/db/drizzle.ts`. No new raw SQL. `lib/db/admin/audit-log.ts` is a legacy raw-SQL file: reuse `createAuditLog()` from it, do not edit it.
- Every `UPDATE`/`DELETE` on `products` in `lib/db/product-drafts.ts` includes `eq(products.is_draft, 1)` in its `WHERE`. No tool accepts or writes `is_draft`, `is_active`, `is_featured`.
- Tool error codes: `validation_error | not_found | conflict | limit_exceeded | internal_error`. Messages in French.
- Image limits: ≤ 8 URLs per `add_product_images` call, ≤ 12 images per product.
- Token lifetimes stay at plugin defaults (access 3600 s, refresh 604800 s, code 600 s).
- Attribute conventions: colors stored as `name = "Couleur"`, `value = "<name>|<#hex>"`; dimensions as `Longueur`, `Hauteur`, `Largeur`, `Poids`; variant `attributes` JSON is `{ "color": "<name>:<#hex>" }` (matches `components/admin/product-wizard/step-pricing.tsx`).
- Commit scopes allowed by commitlint: `storefront | admin | whatsapp | auth | db | seo | claude | ci | deps | release`.
- Pre-commit runs `tsc --noEmit`, `eslint`, `vitest run`, migration-safety check. Every commit must pass them.
- Quote route-group paths in bash: `"app/(admin-auth)/..."`.
- Work on branch `feat/admin-mcp-server` (already created, holds the spec).

---

### Task 1: SDK dependency, OAuth tables, migration

**Files:**
- Modify: `package.json` (dependency)
- Modify: `lib/db/schema.ts` (after the `rateLimit` table, ~line 100)
- Create: `drizzle/0017_*.sql` + `drizzle/meta/*` (generated)

**Interfaces:**
- Produces: Drizzle tables `oauthApplication`, `oauthAccessToken`, `oauthConsent` exported from `@/lib/db/schema` (used by Task 3 for the client-name lookup).

- [ ] **Step 1: Install the MCP SDK**

```bash
npm install @modelcontextprotocol/sdk@^1.30.0
```

Expected: `package.json` gains `"@modelcontextprotocol/sdk": "^1.30.0"` under `dependencies`. Verify the transport file exists:

```bash
ls node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.js
```

- [ ] **Step 2: Add the three OAuth tables to the Drizzle schema**

Insert right after the `rateLimit` table definition in `lib/db/schema.ts`:

```ts
// better-auth `mcp` plugin (OAuth 2.1 provider for MCP clients). Column names
// mirror node_modules/better-auth/dist/plugins/oidc-provider/schema.mjs exactly:
// better-auth reaches these tables through its own Kysely adapter, so a
// mismatch here fails at request time, not at compile time. Dates are ISO
// strings (the adapter runs with supportsDates: false on sqlite), booleans 0/1.
export const oauthApplication = sqliteTable("oauthApplication", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  metadata: text("metadata"),
  clientId: text("clientId").unique().notNull(),
  clientSecret: text("clientSecret"),
  redirectUrls: text("redirectUrls").notNull(),
  type: text("type").notNull(),
  disabled: integer("disabled").notNull().default(0),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthApplication_userId").on(table.userId),
]);

export const oauthAccessToken = sqliteTable("oauthAccessToken", {
  id: text("id").primaryKey(),
  accessToken: text("accessToken").unique().notNull(),
  refreshToken: text("refreshToken").unique().notNull(),
  accessTokenExpiresAt: text("accessTokenExpiresAt").notNull(),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt").notNull(),
  clientId: text("clientId").notNull().references(() => oauthApplication.clientId, { onDelete: "cascade" }),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  scopes: text("scopes").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthAccessToken_clientId").on(table.clientId),
  index("idx_oauthAccessToken_userId").on(table.userId),
]);

export const oauthConsent = sqliteTable("oauthConsent", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull().references(() => oauthApplication.clientId, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  scopes: text("scopes").notNull(),
  consentGiven: integer("consentGiven").notNull().default(0),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthConsent_clientId").on(table.clientId),
  index("idx_oauthConsent_userId").on(table.userId),
]);
```

- [ ] **Step 3: Generate and review the migration**

```bash
npx wrangler d1 execute netereka-db --local --command "SELECT 1" >/dev/null
npm run db:generate
ls drizzle | tail -3
```

Open the new `drizzle/0017_*.sql`. Expected content: three `CREATE TABLE` statements (`oauthApplication`, `oauthAccessToken`, `oauthConsent`) with the FKs above and five `CREATE INDEX` statements. Nothing else (no `DROP`, no `ALTER`). If drizzle-kit emits changes to other tables, stop: the local schema drifted, run `npm run db:migrate` first and regenerate.

- [ ] **Step 4: Apply locally and run the safety check**

```bash
npm run db:migrate
npm run check:migrations
npx tsc --noEmit
```

Expected: migration applied, `[migration-safety]` reports no violation, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/db/schema.ts drizzle/
git commit -m "feat(db): add better-auth OAuth tables for the MCP plugin"
```

---

### Task 2: better-auth `mcp` plugin, forced consent, discovery routes

**Files:**
- Create: `lib/auth/mcp-consent-hook.ts`
- Modify: `lib/auth/index.ts` (imports at top; `plugins` array and `hooks` inside `buildAuthOptions`)
- Create: `app/.well-known/oauth-authorization-server/route.ts`
- Create: `app/.well-known/oauth-protected-resource/route.ts`
- Test: `__tests__/unit/lib/auth/mcp-consent-hook.test.ts`
- Test: `__tests__/unit/auth-config.test.ts` (append a `describe`)

**Interfaces:**
- Produces: `forceConsentQuery(path, query)` in `lib/auth/mcp-consent-hook.ts`; `MCP_AUTHORIZE_PATH = "/mcp/authorize"`; the auth instance from `initAuth()` now exposes `auth.api.getMcpSession` (used by Task 11 via `withMcpAuth`).

- [ ] **Step 1: Write the failing hook test**

`__tests__/unit/lib/auth/mcp-consent-hook.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { forceConsentQuery, MCP_AUTHORIZE_PATH } from "@/lib/auth/mcp-consent-hook";

describe("forceConsentQuery", () => {
  it("ignore les autres endpoints", () => {
    expect(forceConsentQuery("/sign-in/email", { prompt: "none" })).toBeUndefined();
    expect(forceConsentQuery(undefined, { prompt: "none" })).toBeUndefined();
  });

  it("force prompt=consent quand le client n'envoie rien", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { client_id: "c1" }))
      .toEqual({ client_id: "c1", prompt: "consent" });
  });

  it("écrase prompt=none et prompt=login", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { prompt: "none" })?.prompt).toBe("consent");
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, { prompt: "login" })?.prompt).toBe("consent");
  });

  it("tolère une query absente", () => {
    expect(forceConsentQuery(MCP_AUTHORIZE_PATH, undefined)).toEqual({ prompt: "consent" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/mcp-consent-hook.test.ts
```

Expected: FAIL, module `@/lib/auth/mcp-consent-hook` not found.

- [ ] **Step 3: Implement the hook helper**

`lib/auth/mcp-consent-hook.ts`:

```ts
/**
 * better-auth's `mcp` plugin (1.6.25) issues an authorization code without any
 * consent screen as soon as the user has a session, unless the client sends
 * `prompt=consent` (node_modules/better-auth/dist/plugins/mcp/authorize.mjs,
 * `if (query.prompt !== "consent")`). Dynamic client registration is open — it
 * has to be, claude.ai and ChatGPT register themselves — so without this hook a
 * malicious site could register a client with its own redirect URI, send a
 * signed-in admin to the authorize URL, and collect an admin token silently.
 *
 * Forcing `prompt=consent` on every /mcp/authorize request routes the flow
 * through `oidcConfig.consentPage`, where a human must click "Autoriser".
 *
 * Pure function so the rule is unit-testable without a better-auth context.
 */
export const MCP_AUTHORIZE_PATH = "/mcp/authorize";

export function forceConsentQuery(
  path: string | undefined,
  query: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (path !== MCP_AUTHORIZE_PATH) return undefined;
  return { ...(query ?? {}), prompt: "consent" };
}
```

- [ ] **Step 4: Run the hook test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/mcp-consent-hook.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Write the failing auth-config tests**

Append to `__tests__/unit/auth-config.test.ts`:

```ts
describe("auth configuration — MCP OAuth provider", () => {
  function mcpPlugin() {
    const opts = buildAuthOptions(env);
    return opts.plugins.find((p) => p.id === "mcp") as
      | { id: string; options?: { loginPage?: string; resource?: string; oidcConfig?: { consentPage?: string; requirePKCE?: boolean } } }
      | undefined;
  }

  it("registers the mcp plugin against the admin login page", () => {
    expect(mcpPlugin()).toBeDefined();
    expect(mcpPlugin()?.options?.loginPage).toBe("/admin/login");
  });

  it("declares /api/mcp as the protected resource", () => {
    expect(mcpPlugin()?.options?.resource).toBe("https://netereka.ci/api/mcp");
  });

  it("routes consent through the admin consent page and requires PKCE", () => {
    expect(mcpPlugin()?.options?.oidcConfig?.consentPage).toBe("/admin/mcp/consent");
    expect(mcpPlugin()?.options?.oidcConfig?.requirePKCE).toBe(true);
  });

  it("installs a before hook (the forced-consent guard)", () => {
    const opts = buildAuthOptions(env);
    expect(typeof opts.hooks?.before).toBe("function");
  });
});
```

- [ ] **Step 6: Run to verify they fail**

```bash
npx vitest run __tests__/unit/auth-config.test.ts
```

Expected: the 4 new tests FAIL (`mcpPlugin()` undefined, `hooks` undefined).

- [ ] **Step 7: Wire the plugin and hook into `buildAuthOptions`**

In `lib/auth/index.ts`, extend the imports:

```ts
import { captcha, emailOTP, admin, mcp } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { forceConsentQuery } from "@/lib/auth/mcp-consent-hook";
```

Inside the returned options object of `buildAuthOptions`, add `hooks` next to `session` (before `plugins`):

```ts
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // See lib/auth/mcp-consent-hook.ts — every /mcp/authorize must show
        // the consent page. Returning { context } merges into the endpoint
        // context (better-auth/dist/api/dispatch.mjs, defuReplaceArrays).
        const query = forceConsentQuery(ctx.path, ctx.query as Record<string, unknown> | undefined);
        if (!query) return;
        return { context: { query } };
      }),
    },
```

Append to the `plugins` array, after `emailOTP({...})`:

```ts
      mcp({
        loginPage: "/admin/login",
        // Advertised in the protected-resource metadata; MCP clients bind
        // their token request to it.
        resource: `${cfEnv.SITE_URL}/api/mcp`,
        oidcConfig: {
          consentPage: "/admin/mcp/consent",
          requirePKCE: true,
        },
      }),
```

- [ ] **Step 8: Run the auth-config tests and tsc**

```bash
npx vitest run __tests__/unit/auth-config.test.ts
npx tsc --noEmit
```

Expected: all pass. If tsc rejects `p.id` on the plugin union, cast in the test: `(opts.plugins as Array<{ id: string; options?: unknown }>)`.

- [ ] **Step 9: Add the root discovery routes**

`app/.well-known/oauth-authorization-server/route.ts`:

```ts
import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { initAuth } from "@/lib/auth";

// better-auth serves this document under /api/auth/.well-known/… ; several MCP
// clients probe the site root first (RFC 8414 default), so mirror it here.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return oAuthDiscoveryMetadata(auth)(request);
}
```

`app/.well-known/oauth-protected-resource/route.ts`:

```ts
import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { initAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await initAuth();
  return oAuthProtectedResourceMetadata(auth)(request);
}
```

- [ ] **Step 10: Smoke-test discovery locally**

```bash
npm run dev &
sleep 8
curl -s http://localhost:3000/.well-known/oauth-authorization-server | head -c 400; echo
curl -s http://localhost:3000/api/auth/.well-known/oauth-protected-resource; echo
kill %1
```

Expected: first JSON contains `"authorization_endpoint":"http://localhost:3000/api/auth/mcp/authorize"` and `"registration_endpoint"`; second contains `"resource":"http://localhost:3000/api/mcp"`.

- [ ] **Step 11: Commit**

```bash
git add lib/auth/index.ts lib/auth/mcp-consent-hook.ts "app/.well-known" __tests__/unit/lib/auth/mcp-consent-hook.test.ts __tests__/unit/auth-config.test.ts
git commit -m "feat(auth): turn better-auth into an OAuth provider for MCP clients with forced consent"
```

---

### Task 3: Consent page `/admin/mcp/consent`

**Files:**
- Create: `app/(admin-auth)/admin/mcp/consent/page.tsx`
- Create: `app/(admin-auth)/admin/mcp/consent/consent-form.tsx`
- Create: `lib/auth/mcp-consent-client.ts`
- Test: `__tests__/unit/lib/auth/mcp-consent-client.test.ts`

**Interfaces:**
- Consumes: `oauthApplication` table (Task 1), `getOptionalSession()` from `@/lib/auth/guards`.
- Produces: `findOAuthClientName(clientId): Promise<string | null>` in `lib/auth/mcp-consent-client.ts`.

- [ ] **Step 1: Write the failing test for the client lookup**

`__tests__/unit/lib/auth/mcp-consent-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ raw: vi.fn(), bound: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => ({
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const stmt = { sql, params };
        mocks.bound(stmt);
        return {
          run: async () => ({ success: true, meta: {}, results: [] }),
          all: async () => ({ results: await mocks.raw(stmt) }),
          raw: () => mocks.raw(stmt),
        };
      },
    }),
    batch: async () => [],
  }),
}));

import { findOAuthClientName } from "@/lib/auth/mcp-consent-client";

describe("findOAuthClientName", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("retourne le nom du client enregistré", async () => {
    mocks.raw.mockResolvedValue([["Claude Desktop"]]);
    await expect(findOAuthClientName("client-1")).resolves.toBe("Claude Desktop");
    const stmt = mocks.bound.mock.calls[0][0] as { sql: string; params: unknown[] };
    expect(stmt.sql).toMatch(/from "oauthApplication"/i);
    expect(stmt.params).toEqual(["client-1"]);
  });

  it("retourne null pour un client inconnu", async () => {
    mocks.raw.mockResolvedValue([]);
    await expect(findOAuthClientName("nope")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/mcp-consent-client.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement the lookup**

`lib/auth/mcp-consent-client.ts`:

```ts
import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { oauthApplication } from "@/lib/db/schema";

/** Name a dynamically-registered MCP client gave itself. Untrusted: render escaped. */
export async function findOAuthClientName(clientId: string): Promise<string | null> {
  const db = await getDrizzle();
  const row = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .limit(1)
    .get();
  return row?.name ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/mcp-consent-client.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Create the server page**

`app/(admin-auth)/admin/mcp/consent/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/guards";
import { findOAuthClientName } from "@/lib/auth/mcp-consent-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
}

/**
 * Landing page of the forced OAuth consent step (lib/auth/mcp-consent-hook.ts).
 * better-auth redirected here with `consent_code` in a signed cookie plus
 * `client_id` and `scope` in the query. The form posts to
 * /api/auth/oauth2/consent, which answers with the redirect URI to follow.
 */
export default async function McpConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getOptionalSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const clientId = first(params.client_id);
  const scopes = (first(params.scope) ?? "").split(" ").filter(Boolean);
  const clientName = clientId ? await findOAuthClientName(clientId) : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="NETEREKA" width={180} height={64} className="mx-auto h-14 w-auto" priority />
          <p className="mt-2 text-sm text-muted-foreground">Espace Administration</p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Autoriser un assistant IA</CardTitle>
            <CardDescription>
              Connecté en tant que {session.user.name} ({session.user.email})
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {clientName ? (
              <p className="text-sm">
                <span className="font-semibold">{clientName}</span> demande l&apos;accès à
                l&apos;administration NETEREKA en votre nom. Il pourra créer et modifier des
                brouillons produits, mais jamais les publier.
              </p>
            ) : (
              <p className="text-sm text-destructive">
                Client OAuth inconnu. Relancez la connexion depuis votre assistant.
              </p>
            )}
            {scopes.length > 0 ? (
              <p className="text-xs text-muted-foreground">Portées demandées : {scopes.join(", ")}</p>
            ) : null}
            <ConsentForm disabled={!clientName} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create the client form**

`app/(admin-auth)/admin/mcp/consent/consent-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsentForm({ disabled }: { disabled: boolean }) {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState("");

  async function submit(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError("");
    try {
      // Same-origin POST: better-auth validates the Origin header, and the
      // consent code travels in the signed `oidc_consent_prompt` cookie.
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept }),
      });
      const body = (await res.json().catch(() => null)) as { redirectURI?: string } | null;
      if (!res.ok || !body?.redirectURI) {
        setError("La demande a expiré. Relancez la connexion depuis votre assistant.");
        setPending(null);
        return;
      }
      window.location.assign(body.redirectURI);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="h-11 w-full" disabled={disabled || pending !== null} onClick={() => submit(true)}>
        {pending === "accept" ? "Autorisation…" : "Autoriser"}
      </Button>
      <Button variant="outline" className="h-11 w-full" disabled={pending !== null} onClick={() => submit(false)}>
        {pending === "deny" ? "Refus…" : "Refuser"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint "app/(admin-auth)/admin/mcp" lib/auth/mcp-consent-client.ts
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add "app/(admin-auth)/admin/mcp" lib/auth/mcp-consent-client.ts __tests__/unit/lib/auth/mcp-consent-client.test.ts
git commit -m "feat(auth): admin consent page for MCP OAuth clients"
```

---

### Task 4: Resume the OAuth flow after admin login

**Files:**
- Create: `lib/auth/oauth-resume.ts`
- Modify: `app/(admin-auth)/admin/login/page.tsx` (imports, `onSubmit`)
- Test: `__tests__/unit/lib/auth/oauth-resume.test.ts`

**Interfaces:**
- Produces: `getOAuthResumeUrl(params: URLSearchParams): string | null`.

- [ ] **Step 1: Write the failing test**

`__tests__/unit/lib/auth/oauth-resume.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getOAuthResumeUrl } from "@/lib/auth/oauth-resume";

describe("getOAuthResumeUrl", () => {
  it("retourne null sans paramètres OAuth", () => {
    expect(getOAuthResumeUrl(new URLSearchParams(""))).toBeNull();
    expect(getOAuthResumeUrl(new URLSearchParams("redirect=/dashboard"))).toBeNull();
  });

  it("exige client_id, redirect_uri et response_type", () => {
    expect(getOAuthResumeUrl(new URLSearchParams("client_id=c&redirect_uri=http://x"))).toBeNull();
  });

  it("reconstruit l'URL d'autorisation avec la query intacte", () => {
    const params = new URLSearchParams(
      "client_id=c1&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Fcb&response_type=code&state=s1&code_challenge=abc&code_challenge_method=S256",
    );
    expect(getOAuthResumeUrl(params)).toBe(`/api/auth/mcp/authorize?${params.toString()}`);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/oauth-resume.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/auth/oauth-resume.ts`:

```ts
const REQUIRED_PARAMS = ["client_id", "redirect_uri", "response_type"] as const;

/**
 * The better-auth `mcp` plugin sends an unauthenticated /mcp/authorize caller
 * to `/admin/login?<original OAuth query>`. After sign-in the browser must go
 * back to the authorize endpoint with that same query so the flow continues
 * (and lands on the consent page). Same-origin path, hardcoded on purpose.
 */
export function getOAuthResumeUrl(params: URLSearchParams): string | null {
  for (const key of REQUIRED_PARAMS) {
    if (!params.get(key)) return null;
  }
  return `/api/auth/mcp/authorize?${params.toString()}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/oauth-resume.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Use it in the admin login page**

In `app/(admin-auth)/admin/login/page.tsx`:

Add imports:

```ts
import { useRouter, useSearchParams } from "next/navigation";
import { getOAuthResumeUrl } from "@/lib/auth/oauth-resume";
```

(replace the existing `import { useRouter } from "next/navigation";`).

Inside the component, right after `const router = useRouter();`:

```ts
  const searchParams = useSearchParams();
  const resumeUrl = getOAuthResumeUrl(searchParams);
```

Replace the body of `onSubmit` from `const { error } = await authClient.signIn.email({` through `router.refresh();` with:

```ts
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });

      if (error) {
        // OAuth resume: the mcp plugin's after-hook turns a successful sign-in
        // into a 302 that fetch follows to an HTML page, so the client lib can
        // report an error although the session cookie was set. Trust the
        // server-side role check instead of the parse failure.
        if (resumeUrl) {
          const check = await verifyAdminRole();
          if (check.success) {
            window.location.assign(resumeUrl);
            return;
          }
        }
        resetCaptcha();
        setServerError(
          errorCodeMessages[error.code ?? ""] ??
            errorTextMessages[error.message ?? ""] ??
            "Une erreur est survenue."
        );
        return;
      }

      // Verify admin role server-side
      const result = await verifyAdminRole();
      if (!result.success) {
        setServerError(result.error ?? "Accès refusé.");
        return;
      }

      if (resumeUrl) {
        // Full navigation, not router.push: the target is an API route.
        window.location.assign(resumeUrl);
        return;
      }

      router.push("/dashboard");
      router.refresh();
```

- [ ] **Step 6: Type-check, lint, full test run**

```bash
npx tsc --noEmit && npx eslint "app/(admin-auth)/admin/login/page.tsx" && npx vitest run
```

Expected: clean, all tests pass. `useSearchParams` needs no Suspense boundary here: `app/(admin-auth)/layout.tsx` already sets `dynamic = "force-dynamic"`.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/oauth-resume.ts "app/(admin-auth)/admin/login/page.tsx" __tests__/unit/lib/auth/oauth-resume.test.ts
git commit -m "feat(auth): resume the MCP OAuth authorize flow after admin login"
```

---

### Task 5: Product audit actions

**Files:**
- Modify: `lib/db/types.ts` (`AuditAction` union, ~line 347)
- Modify: `lib/constants/audit.ts`
- Test: `__tests__/unit/constants.test.ts` (append)

**Interfaces:**
- Produces: `AuditAction` gains `"product.draft_created" | "product.draft_updated" | "product.draft_deleted"`; used by Task 10 through `createAuditLog` from `@/lib/db/admin/audit-log`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/unit/constants.test.ts`:

```ts
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS } from "@/lib/constants/audit";

describe("audit actions — product drafts (MCP)", () => {
  it.each(["product.draft_created", "product.draft_updated", "product.draft_deleted"] as const)(
    "%s a un libellé et une option de filtre",
    (action) => {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
      expect(AUDIT_ACTION_OPTIONS.some((o) => o.value === action)).toBe(true);
    },
  );
});
```

(If the file already imports from `@/lib/constants/audit`, merge the import.)

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run __tests__/unit/constants.test.ts
```

Expected: FAIL (tsc type error on the key, or undefined label).

- [ ] **Step 3: Extend the type and labels**

`lib/db/types.ts`:

```ts
export type AuditAction =
  | "user.created"
  | "user.role_changed"
  | "user.banned"
  | "user.unbanned"
  | "product.draft_created"
  | "product.draft_updated"
  | "product.draft_deleted";
```

`lib/constants/audit.ts`:

```ts
import type { AuditAction } from "@/lib/db/types";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.created": "Création de compte",
  "user.role_changed": "Changement de rôle",
  "user.banned": "Bannissement",
  "user.unbanned": "Débannissement",
  "product.draft_created": "Brouillon produit créé",
  "product.draft_updated": "Brouillon produit modifié",
  "product.draft_deleted": "Brouillon produit supprimé",
};

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes les actions" },
  ...(Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][]).map(([value, label]) => ({ value, label })),
];
```

- [ ] **Step 4: Run tests and tsc**

```bash
npx vitest run __tests__/unit/constants.test.ts && npx tsc --noEmit
```

Expected: pass, clean.

- [ ] **Step 5: Commit**

```bash
git add lib/db/types.ts lib/constants/audit.ts __tests__/unit/constants.test.ts
git commit -m "feat(admin): audit actions for product drafts"
```

---

### Task 6: MCP input validation schemas

**Files:**
- Modify: `lib/validations/product-ai.ts` (export `colorSchema`, `dimensionsSchema`, `specSchema`)
- Create: `lib/validations/mcp-product.ts`
- Test: `__tests__/unit/lib/validations/mcp-product.test.ts`

**Interfaces:**
- Produces (all from `@/lib/validations/mcp-product`): `idSchema`, `createDraftSchema`, `updateDraftSchema`, `addImagesSchema`, `setVariantsSchema`, `searchProductsSchema`, and types `CreateDraftInput`, `UpdateDraftInput`, `AddImagesInput`, `SetVariantsInput`, `DraftAttributesInput`.

- [ ] **Step 1: Export the attribute sub-schemas**

In `lib/validations/product-ai.ts`, change `const colorSchema`, `const dimensionsSchema`, `const specSchema` to `export const …`. No other change.

- [ ] **Step 2: Write the failing tests**

`__tests__/unit/lib/validations/mcp-product.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  createDraftSchema,
  updateDraftSchema,
  addImagesSchema,
  setVariantsSchema,
  searchProductsSchema,
} from "@/lib/validations/mcp-product";

describe("createDraftSchema", () => {
  it("exige name et category_id", () => {
    expect(createDraftSchema.safeParse({}).success).toBe(false);
    expect(createDraftSchema.safeParse({ name: "X", category_id: "cat-1" }).success).toBe(true);
  });

  it("borne name à 150 et short_description à 120", () => {
    expect(createDraftSchema.safeParse({ name: "a".repeat(151), category_id: "c" }).success).toBe(false);
    expect(createDraftSchema.safeParse({ name: "a", category_id: "c", short_description: "b".repeat(121) }).success).toBe(false);
  });

  it("valide la story avec les règles de product-story", () => {
    const base = { name: "a", category_id: "c" };
    expect(createDraftSchema.safeParse({ ...base, story: { highlights: [{ icon: "camera", label: "x" }] } }).success).toBe(false);
    expect(createDraftSchema.safeParse({
      ...base,
      story: { tagline: "  t  ", highlights: [
        { icon: "camera", label: "a" }, { icon: "battery", label: "b" }, { icon: "display", label: "c" },
      ] },
    }).data?.story?.tagline).toBe("t");
  });

  it("refuse une couleur hex invalide et plus de 12 couleurs", () => {
    const base = { name: "a", category_id: "c" };
    expect(createDraftSchema.safeParse({ ...base, attributes: { colors: [{ name: "Noir", hex: "black" }] } }).success).toBe(false);
    const colors = Array.from({ length: 13 }, (_, i) => ({ name: `c${i}`, hex: "#000000" }));
    expect(createDraftSchema.safeParse({ ...base, attributes: { colors } }).success).toBe(false);
  });

  it("refuse un prix négatif ou décimal", () => {
    const base = { name: "a", category_id: "c" };
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: -1 } }).success).toBe(false);
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: 10.5 } }).success).toBe(false);
    expect(createDraftSchema.safeParse({ ...base, pricing: { base_price: 15000, compare_price: null } }).success).toBe(true);
  });
});

describe("updateDraftSchema", () => {
  it("accepte un patch vide et distingue null d'absent", () => {
    const r = updateDraftSchema.safeParse({ brand: null });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ brand: null });
    expect(updateDraftSchema.safeParse({}).success).toBe(true);
  });

  it("valide le format du slug", () => {
    expect(updateDraftSchema.safeParse({ slug: "iphone-15-pro" }).success).toBe(true);
    expect(updateDraftSchema.safeParse({ slug: "IPhone 15" }).success).toBe(false);
    expect(updateDraftSchema.safeParse({ slug: "-bad" }).success).toBe(false);
  });
});

describe("addImagesSchema", () => {
  it("exige 1 à 8 URLs http(s)", () => {
    expect(addImagesSchema.safeParse({ images: [] }).success).toBe(false);
    expect(addImagesSchema.safeParse({ images: [{ url: "ftp://x/a.jpg" }] }).success).toBe(false);
    const nine = Array.from({ length: 9 }, (_, i) => ({ url: `https://x.test/${i}.jpg` }));
    expect(addImagesSchema.safeParse({ images: nine }).success).toBe(false);
    expect(addImagesSchema.safeParse({ images: nine.slice(0, 8) }).success).toBe(true);
  });
});

describe("setVariantsSchema", () => {
  it("uniform_price vaut true par défaut", () => {
    const r = setVariantsSchema.safeParse({ variants: [{ color_name: "Noir", color_hex: "#000000", stock: 3 }] });
    expect(r.success).toBe(true);
    expect(r.data?.uniform_price).toBe(true);
  });

  it("refuse un stock négatif", () => {
    expect(setVariantsSchema.safeParse({ variants: [{ color_name: "Noir", color_hex: "#000000", stock: -1 }] }).success).toBe(false);
  });
});

describe("searchProductsSchema", () => {
  it("borne la requête et la limite", () => {
    expect(searchProductsSchema.safeParse({ query: "ab" }).success).toBe(false);
    expect(searchProductsSchema.safeParse({ query: "abc" }).data?.limit).toBe(20);
    expect(searchProductsSchema.safeParse({ query: "abc", limit: 51 }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
npx vitest run __tests__/unit/lib/validations/mcp-product.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 4: Implement the schemas**

`lib/validations/mcp-product.ts`:

```ts
import { z } from "zod";
import { colorSchema, dimensionsSchema, specSchema } from "@/lib/validations/product-ai";
import { taglineSchema, highlightsSchema, featureBlocksSchema, faqSchema } from "@/lib/validations/product-story";

/**
 * Input contracts of the MCP product tools (lib/mcp/tools/products.ts).
 * Story and attribute rules are the wizard's own schemas, reused so the MCP
 * cannot write a product the admin UI would reject.
 */

export const idSchema = z.string().trim().min(1).max(64);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Upper bound of sanitizeDescriptionHtml's input (lib/utils/sanitize-html.ts). */
const DESCRIPTION_MAX_BYTES = 512_000;

export const draftAttributesSchema = z.object({
  colors: z.array(colorSchema).max(12).default([]),
  dimensions: dimensionsSchema.default({}),
  specs: z.array(specSchema).max(20).default([]),
});

const storyInputSchema = z.object({
  tagline: taglineSchema.optional(),
  highlights: highlightsSchema.optional(),
  feature_blocks: featureBlocksSchema.optional(),
  faq: faqSchema.optional(),
});

const seoSchema = z.object({
  meta_title: z.string().trim().max(60).nullable().optional(),
  meta_description: z.string().trim().max(160).nullable().optional(),
});

const pricingSchema = z.object({
  base_price: z.number().int().min(0).optional(),
  compare_price: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().min(1).max(64).nullable().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  weight_grams: z.number().int().positive().nullable().optional(),
});

export const createDraftSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category_id: idSchema,
  brand: z.string().trim().max(80).nullable().optional(),
  short_description: z.string().trim().max(120).nullable().optional(),
  description_html: z.string().max(DESCRIPTION_MAX_BYTES).nullable().optional(),
  story: storyInputSchema.optional(),
  seo: seoSchema.optional(),
  attributes: draftAttributesSchema.optional(),
  pricing: pricingSchema.optional(),
});

export const updateDraftSchema = createDraftSchema.partial().extend({
  slug: z.string().trim().max(160).regex(SLUG_RE, "Slug invalide (minuscules, chiffres, tirets)").optional(),
});

export const addImagesSchema = z.object({
  images: z
    .array(z.object({
      url: z.string().url().max(2048).refine((u) => /^https?:\/\//i.test(u), "URL http(s) requise"),
      alt: z.string().trim().max(200).nullable().optional(),
    }))
    .min(1)
    .max(8),
});

export const setVariantsSchema = z.object({
  variants: z
    .array(z.object({
      color_name: z.string().trim().min(1).max(40),
      color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)"),
      stock: z.number().int().min(0),
      price: z.number().int().min(0).nullable().optional(),
    }))
    .max(12),
  uniform_price: z.boolean().default(true),
});

export const searchProductsSchema = z.object({
  query: z.string().trim().min(3).max(100),
  limit: z.number().int().min(1).max(50).default(20),
});

export type DraftAttributesInput = z.infer<typeof draftAttributesSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type AddImagesInput = z.infer<typeof addImagesSchema>;
export type SetVariantsInput = z.infer<typeof setVariantsSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
```

- [ ] **Step 5: Run the tests**

```bash
npx vitest run __tests__/unit/lib/validations/mcp-product.test.ts && npx tsc --noEmit
```

Expected: all pass, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add lib/validations/product-ai.ts lib/validations/mcp-product.ts __tests__/unit/lib/validations/mcp-product.test.ts
git commit -m "feat(admin): zod contracts for the MCP product tools"
```

---

### Task 7: `product-drafts` — create, read, update, search, delete

**Files:**
- Create: `__tests__/helpers/d1-mock.ts`
- Create: `lib/db/product-drafts.ts`
- Test: `__tests__/unit/lib/db/product-drafts.test.ts`

**Interfaces:**
- Consumes: schemas/types from Task 6; `slugify` from `@/lib/utils`; `sanitizeDescriptionHtml` from `@/lib/utils/sanitize-html`; `getImageUrl` from `@/lib/utils/images`; `deleteFromR2` from `@/lib/storage/images`.
- Produces (from `@/lib/db/product-drafts`):
  - `class DraftError extends Error { code: "not_found" | "conflict" | "limit_exceeded" }`
  - `attributesToRows(attrs: DraftAttributesInput | undefined): { name: string; value: string }[]`
  - `createDraft(input: CreateDraftInput): Promise<{ id: string; slug: string }>`
  - `updateDraft(id: string, patch: UpdateDraftInput): Promise<{ id: string; slug: string }>`
  - `getDraft(id: string): Promise<DraftDetail>`
  - `searchProducts(query: string, limit: number): Promise<ProductSearchRow[]>`
  - `deleteDraft(id: string): Promise<void>`
  - types `DraftDetail`, `ProductSearchRow`

- [ ] **Step 1: Create the shared D1 mock helper**

`__tests__/helpers/d1-mock.ts`:

```ts
import { vi } from "vitest";

/**
 * Mocks the D1 binding one level below Drizzle so the real driver compiles the
 * statements. Assertions run against the SQL/params Drizzle emits, which is
 * what catches schema/column drift. Same technique as products-ai.test.ts.
 *
 * `raw` feeds `.get()`/`.all()` with POSITIONAL row arrays in select order
 * (Drizzle's D1 driver reads `stmt.raw()` when a field selection exists).
 * Return `[]` for "no row".
 *
 * Usage:
 *   const d1 = createD1Mock();
 *   vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.binding }));
 */
export interface BoundStatement { sql: string; params: unknown[] }

export function createD1Mock() {
  const bound = vi.fn<(stmt: BoundStatement) => void>();
  const run = vi.fn<(stmt: BoundStatement) => Promise<unknown>>();
  const raw = vi.fn<(stmt: BoundStatement) => Promise<unknown[][]>>();
  const batch = vi.fn<(stmts: BoundStatement[]) => Promise<unknown[]>>();

  const binding = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const stmt = { sql, params };
        bound(stmt);
        return {
          ...stmt,
          run: () => run(stmt),
          all: () => raw(stmt).then((rows) => ({ results: rows })),
          raw: () => raw(stmt),
        };
      },
    }),
    batch: (stmts: BoundStatement[]) => batch(stmts),
  };

  function reset() {
    bound.mockReset();
    run.mockReset().mockResolvedValue({ success: true, meta: { changes: 1 }, results: [] });
    raw.mockReset().mockResolvedValue([]);
    batch.mockReset().mockResolvedValue([]);
  }
  reset();

  /** Statements handed to the Nth `db.batch()` call. */
  const batchStatements = (call = 0) => batch.mock.calls[call][0];
  const boundMatching = (re: RegExp) => bound.mock.calls.map((c) => c[0]).filter((s) => re.test(s.sql));

  return { binding, bound, run, raw, batch, reset, batchStatements, boundMatching };
}
```

- [ ] **Step 2: Write the failing tests**

`__tests__/unit/lib/db/product-drafts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => {
  // createD1Mock is imported above but hoisting needs a lazy reference.
  return { current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock> };
});
const mocks = vi.hoisted(() => ({ deleteFromR2: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: vi.fn() }));

import {
  attributesToRows,
  createDraft,
  updateDraft,
  getDraft,
  searchProducts,
  deleteDraft,
  DraftError,
} from "@/lib/db/product-drafts";

beforeEach(() => {
  d1.current = createD1Mock();
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
});

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");

describe("attributesToRows", () => {
  it("encode couleurs, dimensions et specs avec les conventions du wizard", () => {
    expect(attributesToRows({
      colors: [{ name: "Noir", hex: "#000000" }],
      dimensions: { length_mm: 160, weight_g: 190 },
      specs: [{ name: "Écran", value: "6.1\"" }],
    })).toEqual([
      { name: "Couleur", value: "Noir|#000000" },
      { name: "Longueur", value: "160" },
      { name: "Poids", value: "190" },
      { name: "Écran", value: "6.1\"" },
    ]);
  });

  it("retourne [] sans attributs", () => {
    expect(attributesToRows(undefined)).toEqual([]);
  });
});

describe("createDraft", () => {
  it("refuse une catégorie inconnue", async () => {
    await expect(createDraft({ name: "Galaxy A55", category_id: "nope" }))
      .rejects.toMatchObject({ code: "not_found" });
  });

  it("insère un brouillon inactif avec un slug dérivé du nom, en un seul batch", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "categories"/i.test(stmt.sql) ? [["cat-1"]] : []);

    const r = await createDraft({
      name: "Galaxy A55",
      category_id: "cat-1",
      description_html: "<p>Hi</p><script>x()</script>",
      attributes: { colors: [{ name: "Noir", hex: "#000000" }], dimensions: {}, specs: [] },
      pricing: { base_price: 150000, sku: "GA55" },
    });

    expect(r.slug).toBe("galaxy-a55");
    const stmts = d1.current!.batchStatements();
    const insert = stmts.find((s) => /insert into "products"/i.test(s.sql))!;
    expect(insert.params).toContain("galaxy-a55");
    const strings = insert.params.filter((p): p is string => typeof p === "string");
    expect(strings.some((s) => s.includes("<p>Hi</p>"))).toBe(true);   // sanitized HTML kept
    expect(strings.some((s) => s.includes("<script>"))).toBe(false);   // script stripped
    expect(stmts.filter((s) => /insert into "product_attributes"/i.test(s.sql))).toHaveLength(1);
    // is_draft = 1, is_active = 0 are bound values of the products insert
    expect(insert.params).toEqual(expect.arrayContaining([1, 0]));
  });

  it("suffixe le slug quand il est pris", async () => {
    const taken = new Set(["galaxy-a55", "galaxy-a55-2"]);
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "categories"/i.test(stmt.sql)) return [["cat-1"]];
      if (/from "products"/i.test(stmt.sql) && /"slug" =/i.test(stmt.sql)) {
        return taken.has(stmt.params[0] as string) ? [["other"]] : [];
      }
      return [];
    });
    const r = await createDraft({ name: "Galaxy A55", category_id: "cat-1" });
    expect(r.slug).toBe("galaxy-a55-3");
  });

  it("refuse un SKU déjà utilisé", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "categories"/i.test(stmt.sql)) return [["cat-1"]];
      if (/"sku" =/i.test(stmt.sql)) return [["p-other"]];
      return [];
    });
    await expect(createDraft({ name: "X", category_id: "cat-1", pricing: { sku: "DUP" } }))
      .rejects.toMatchObject({ code: "conflict" });
  });
});

describe("updateDraft", () => {
  it("refuse un produit qui n'est pas un brouillon", async () => {
    await expect(updateDraft("p1", { name: "Y" })).rejects.toMatchObject({ code: "not_found" });
    const probe = d1.current!.boundMatching(/from "products"/i)[0];
    expect(sqlOf(probe)).toMatch(/"is_draft" = \?/);
    expect(probe.params).toContain(1);
  });

  it("met à jour uniquement les champs fournis et remplace les attributs quand présents", async () => {
    d1.current!.raw.mockImplementation(async (stmt) =>
      /from "products"/i.test(stmt.sql) ? [["p1", "old-slug"]] : []);

    const r = await updateDraft("p1", {
      brand: null,
      attributes: { colors: [], dimensions: {}, specs: [{ name: "RAM", value: "8 Go" }] },
    });

    expect(r).toEqual({ id: "p1", slug: "old-slug" });
    const stmts = d1.current!.batchStatements();
    const update = stmts.find((s) => /update "products"/i.test(s.sql))!;
    expect(sqlOf(update)).toMatch(/"brand" = \?/);
    expect(sqlOf(update)).not.toMatch(/"name" = \?/);
    expect(sqlOf(update)).toMatch(/where .*"is_draft" = \?/i);
    expect(stmts.some((s) => /delete from "product_attributes"/i.test(s.sql))).toBe(true);
    expect(stmts.filter((s) => /insert into "product_attributes"/i.test(s.sql))).toHaveLength(1);
  });

  it("refuse un slug explicite déjà pris", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return [["p1", "old-slug"]];
      if (/"slug" = \?/i.test(stmt.sql)) return [["p2"]];
      return [];
    });
    await expect(updateDraft("p1", { slug: "taken" })).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("getDraft", () => {
  it("lève not_found si le brouillon n'existe pas", async () => {
    await expect(getDraft("p1")).rejects.toBeInstanceOf(DraftError);
  });
});

describe("searchProducts", () => {
  it("cherche sur nom, slug et SKU avec la limite", async () => {
    await searchProducts("galaxy", 5);
    const stmt = d1.current!.boundMatching(/from "products"/i)[0];
    expect(sqlOf(stmt)).toMatch(/"name" like \?/i);
    expect(sqlOf(stmt)).toMatch(/"slug" like \?/i);
    expect(sqlOf(stmt)).toMatch(/"sku" like \?/i);
    expect(stmt.params).toContain("%galaxy%");
    expect(stmt.params).toContain(5);
  });

  it("échappe % et _ dans la requête", async () => {
    await searchProducts("100%_x", 5);
    const stmt = d1.current!.boundMatching(/from "products"/i)[0];
    expect(stmt.params).toContain("%100\\%\\_x%");
  });
});

describe("deleteDraft", () => {
  it("supprime enfants puis produit, puis les objets R2, uniquement pour un brouillon", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return [["p1", "slug"]];
      if (/from "product_images"/i.test(stmt.sql)) return [["products/p1/a.jpg"], ["/images/legacy.jpg"]];
      return [];
    });
    await deleteDraft("p1");
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts[stmts.length - 1]).toMatch(/delete from "products" where .*"is_draft" = \?/i);
    expect(stmts.some((s) => /delete from "product_images"/i.test(s))).toBe(true);
    expect(stmts.some((s) => /delete from "product_variants"/i.test(s))).toBe(true);
    expect(stmts.some((s) => /delete from "product_attributes"/i.test(s))).toBe(true);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("legacy.jpg");
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
npx vitest run __tests__/unit/lib/db/product-drafts.test.ts
```

Expected: FAIL, module `@/lib/db/product-drafts` not found.

- [ ] **Step 4: Implement the module (part 1)**

`lib/db/product-drafts.ts`:

```ts
import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { categories, productAttributes, productImages, productVariants, products } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { getImageUrl } from "@/lib/utils/images";
import { deleteFromR2 } from "@/lib/storage/images";
import { fetchAndUploadImage, type FetchImageResult } from "@/lib/ai/image-fetch";
import type {
  AddImagesInput,
  CreateDraftInput,
  DraftAttributesInput,
  SetVariantsInput,
  UpdateDraftInput,
} from "@/lib/validations/mcp-product";

/**
 * Draft-only product persistence for the MCP tools (lib/mcp/tools/products.ts).
 *
 * Invariant: every UPDATE/DELETE on `products` filters on `is_draft = 1`. A
 * published product is unreachable from here by construction — that is the
 * mechanical form of the "drafts only" decision in the spec.
 */

export type DraftErrorCode = "not_found" | "conflict" | "limit_exceeded";

export class DraftError extends Error {
  constructor(public readonly code: DraftErrorCode, message: string) {
    super(message);
    this.name = "DraftError";
  }
}

export const MAX_IMAGES_PER_PRODUCT = 12;

type Statement = BatchItem<"sqlite">;
type Batch = [Statement, ...Statement[]];

// ─── Pure helpers ───

const DIMENSION_LABELS: Array<[keyof DraftAttributesInput["dimensions"], string]> = [
  ["length_mm", "Longueur"],
  ["height_mm", "Hauteur"],
  ["width_mm", "Largeur"],
  ["weight_g", "Poids"],
];

/** Same encoding as the wizard's step 2 and products-ai.ts. */
export function attributesToRows(attrs: DraftAttributesInput | undefined): { name: string; value: string }[] {
  if (!attrs) return [];
  const rows: { name: string; value: string }[] = [];
  for (const c of attrs.colors) rows.push({ name: "Couleur", value: `${c.name}|${c.hex}` });
  for (const [key, label] of DIMENSION_LABELS) {
    const v = attrs.dimensions[key];
    if (v != null) rows.push({ name: label, value: String(v) });
  }
  for (const s of attrs.specs) rows.push({ name: s.name, value: s.value });
  return rows;
}

type ProductColumns = Partial<typeof products.$inferInsert>;

/** Only keys the caller provided end up in the statement; `null` clears. */
function buildProductColumns(input: UpdateDraftInput, productId: string): ProductColumns {
  const cols: ProductColumns = {};
  if (input.name !== undefined) cols.name = input.name;
  if (input.category_id !== undefined) cols.category_id = input.category_id;
  if (input.brand !== undefined) cols.brand = input.brand;
  if (input.short_description !== undefined) cols.short_description = input.short_description;
  if (input.description_html !== undefined) {
    cols.description = input.description_html ? sanitizeDescriptionHtml(input.description_html, productId) : null;
    cols.description_type = "html";
  }
  if (input.seo) {
    if (input.seo.meta_title !== undefined) cols.meta_title = input.seo.meta_title;
    if (input.seo.meta_description !== undefined) cols.meta_description = input.seo.meta_description;
  }
  if (input.story) {
    const s = input.story;
    if (s.tagline !== undefined) cols.tagline = s.tagline;
    if (s.highlights !== undefined) cols.highlights = s.highlights ? JSON.stringify(s.highlights) : null;
    if (s.feature_blocks !== undefined) cols.feature_blocks = s.feature_blocks ? JSON.stringify(s.feature_blocks) : null;
    if (s.faq !== undefined) cols.faq = s.faq ? JSON.stringify(s.faq) : null;
  }
  if (input.pricing) {
    const p = input.pricing;
    if (p.base_price !== undefined) cols.base_price = p.base_price;
    if (p.compare_price !== undefined) cols.compare_price = p.compare_price;
    if (p.sku !== undefined) cols.sku = p.sku;
    if (p.stock_quantity !== undefined) cols.stock_quantity = p.stock_quantity;
    if (p.low_stock_threshold !== undefined) cols.low_stock_threshold = p.low_stock_threshold;
    if (p.weight_grams !== undefined) cols.weight_grams = p.weight_grams;
  }
  return cols;
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function r2KeyFromImageUrl(url: string): string {
  return url.replace(/^\/images\//, "");
}

// ─── DB probes ───

async function requireDraft(db: DrizzleDB, id: string): Promise<{ id: string; slug: string }> {
  const row = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!row) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");
  return row;
}

async function requireCategory(db: DrizzleDB, categoryId: string): Promise<void> {
  const row = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.is_active, 1)))
    .limit(1)
    .get();
  if (!row) throw new DraftError("not_found", "Catégorie introuvable");
}

async function requireSkuFree(db: DrizzleDB, sku: string, excludeId: string | null): Promise<void> {
  const cond = excludeId ? and(eq(products.sku, sku), ne(products.id, excludeId)) : eq(products.sku, sku);
  const row = await db.select({ id: products.id }).from(products).where(cond).limit(1).get();
  if (row) throw new DraftError("conflict", `Le SKU "${sku}" est déjà utilisé`);
}

async function isSlugTaken(db: DrizzleDB, slug: string, excludeId: string): Promise<boolean> {
  const row = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.slug, slug), ne(products.id, excludeId)))
    .limit(1)
    .get();
  return Boolean(row);
}

/** `base`, then `base-2` … `base-20`; null when everything collides (caller uses a placeholder). */
async function ensureUniqueSlug(db: DrizzleDB, base: string, excludeId: string): Promise<string | null> {
  if (!base) return null;
  let candidate = base;
  for (let suffix = 1; suffix <= 20; suffix++) {
    if (!(await isSlugTaken(db, candidate, excludeId))) return candidate;
    candidate = `${base}-${suffix + 1}`;
  }
  return null;
}

// ─── Create / update / read / search / delete ───

export async function createDraft(input: CreateDraftInput): Promise<{ id: string; slug: string }> {
  const db = await getDrizzle();
  await requireCategory(db, input.category_id);
  if (input.pricing?.sku) await requireSkuFree(db, input.pricing.sku, null);

  const id = nanoid();
  const slug = (await ensureUniqueSlug(db, slugify(input.name), id)) ?? `draft-${id}`;
  const cols = buildProductColumns(input, id);

  const stmts: Batch = [
    db.insert(products).values({
      ...cols,
      id,
      name: input.name,
      category_id: input.category_id,
      slug,
      base_price: cols.base_price ?? 0,
      is_active: 0,
      is_draft: 1,
      created_at: sql`datetime('now')`,
      updated_at: sql`datetime('now')`,
    }),
  ];
  for (const row of attributesToRows(input.attributes)) {
    stmts.push(db.insert(productAttributes).values({ id: nanoid(), product_id: id, ...row }));
  }
  await db.batch(stmts);
  return { id, slug };
}

export async function updateDraft(id: string, patch: UpdateDraftInput): Promise<{ id: string; slug: string }> {
  const db = await getDrizzle();
  const current = await requireDraft(db, id);
  if (patch.category_id !== undefined) await requireCategory(db, patch.category_id);
  if (patch.pricing?.sku) await requireSkuFree(db, patch.pricing.sku, id);

  let slug = current.slug;
  if (patch.slug !== undefined) {
    if (await isSlugTaken(db, patch.slug, id)) throw new DraftError("conflict", `Le slug "${patch.slug}" est déjà utilisé`);
    slug = patch.slug;
  }

  const stmts: Batch = [
    db
      .update(products)
      .set({ ...buildProductColumns(patch, id), slug, updated_at: sql`datetime('now')` })
      .where(and(eq(products.id, id), eq(products.is_draft, 1))),
  ];
  if (patch.attributes !== undefined) {
    stmts.push(db.delete(productAttributes).where(eq(productAttributes.product_id, id)));
    for (const row of attributesToRows(patch.attributes)) {
      stmts.push(db.insert(productAttributes).values({ id: nanoid(), product_id: id, ...row }));
    }
  }
  await db.batch(stmts);
  return { id, slug };
}

export interface DraftDetail {
  id: string;
  name: string;
  slug: string;
  edit_url: string;
  category_id: string | null;
  brand: string | null;
  short_description: string | null;
  description_html: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  weight_grams: number | null;
  seo: { meta_title: string | null; meta_description: string | null };
  story: { tagline: string | null; highlights: unknown; feature_blocks: unknown; faq: unknown };
  attributes: { id: string; name: string; value: string }[];
  images: { id: string; url: string; alt: string | null; is_primary: boolean; sort_order: number; variant_id: string | null }[];
  variants: { id: string; name: string; price: number; compare_price: number | null; stock_quantity: number; attributes: unknown }[];
  created_at: string;
  updated_at: string;
}

function parseJson(v: string | null): unknown {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

export async function getDraft(id: string): Promise<DraftDetail> {
  const db = await getDrizzle();
  const p = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!p) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");

  const [attrs, imgs, vars] = await Promise.all([
    db.select({ id: productAttributes.id, name: productAttributes.name, value: productAttributes.value })
      .from(productAttributes).where(eq(productAttributes.product_id, id)).all(),
    db.select({
      id: productImages.id, url: productImages.url, alt: productImages.alt,
      is_primary: productImages.is_primary, sort_order: productImages.sort_order, variant_id: productImages.variant_id,
    }).from(productImages).where(eq(productImages.product_id, id)).orderBy(asc(productImages.sort_order)).all(),
    db.select({
      id: productVariants.id, name: productVariants.name, price: productVariants.price,
      compare_price: productVariants.compare_price, stock_quantity: productVariants.stock_quantity, attributes: productVariants.attributes,
    }).from(productVariants).where(eq(productVariants.product_id, id)).orderBy(asc(productVariants.sort_order)).all(),
  ]);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    edit_url: `/products/${p.id}/edit`,
    category_id: p.category_id,
    brand: p.brand,
    short_description: p.short_description,
    description_html: p.description,
    base_price: p.base_price,
    compare_price: p.compare_price,
    sku: p.sku,
    stock_quantity: p.stock_quantity,
    low_stock_threshold: p.low_stock_threshold,
    weight_grams: p.weight_grams,
    seo: { meta_title: p.meta_title, meta_description: p.meta_description },
    story: {
      tagline: p.tagline,
      highlights: parseJson(p.highlights),
      feature_blocks: parseJson(p.feature_blocks),
      faq: parseJson(p.faq),
    },
    attributes: attrs,
    images: imgs.map((i) => ({ ...i, url: getImageUrl(i.url), is_primary: i.is_primary === 1 })),
    variants: vars.map((v) => ({ ...v, attributes: parseJson(v.attributes) })),
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export interface ProductSearchRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  sku: string | null;
  base_price: number;
  is_draft: boolean;
  is_active: boolean;
}

/** Drafts and published products alike: this is the duplicate detector. */
export async function searchProducts(query: string, limit: number): Promise<ProductSearchRow[]> {
  const db = await getDrizzle();
  const pattern = `%${escapeLike(query)}%`;
  const rows = await db
    .select({
      id: products.id, name: products.name, slug: products.slug, brand: products.brand,
      sku: products.sku, base_price: products.base_price, is_draft: products.is_draft, is_active: products.is_active,
    })
    .from(products)
    .where(or(
      sql`${products.name} like ${pattern} escape '\\'`,
      sql`${products.slug} like ${pattern} escape '\\'`,
      sql`${products.sku} like ${pattern} escape '\\'`,
    ))
    .orderBy(asc(products.name))
    .limit(limit)
    .all();
  return rows.map((r) => ({ ...r, is_draft: r.is_draft === 1, is_active: r.is_active === 1 }));
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDrizzle();
  await requireDraft(db, id);
  const imgs = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.product_id, id)).all();

  // Children explicitly, like actions/admin/products.ts deleteProduct — do not
  // rely on FK cascade being enabled on the D1 connection.
  await db.batch([
    db.delete(productImages).where(eq(productImages.product_id, id)),
    db.delete(productVariants).where(eq(productVariants.product_id, id)),
    db.delete(productAttributes).where(eq(productAttributes.product_id, id)),
    db.delete(products).where(and(eq(products.id, id), eq(products.is_draft, 1))),
  ]);

  const cleanup = await Promise.allSettled(imgs.map((i) => deleteFromR2(r2KeyFromImageUrl(i.url))));
  for (const c of cleanup) {
    if (c.status === "rejected") console.warn("[product-drafts] orphan R2 object after deleteDraft", id, c.reason);
  }
}

// ─── Images and variants: see Task 8 ───
export { fetchAndUploadImage as _fetchAndUploadImage };
export type { FetchImageResult as _FetchImageResult, AddImagesInput as _AddImagesInput, SetVariantsInput as _SetVariantsInput };
```

The last two `export` lines exist only so the not-yet-used imports do not fail lint before Task 8; Task 8 removes them.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run __tests__/unit/lib/db/product-drafts.test.ts
```

Expected: all pass. If the `like` assertion in `searchProducts` fails because Drizzle renders the raw `sql` template with different quoting, adjust the regex to `/"name" like \?/i` on `sqlOf(stmt)` (whitespace-normalised) — the parameter assertions are the important ones.

- [ ] **Step 6: Lint and type-check**

```bash
npx tsc --noEmit && npx eslint lib/db/product-drafts.ts __tests__/helpers/d1-mock.ts __tests__/unit/lib/db/product-drafts.test.ts
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/db/product-drafts.ts __tests__/helpers/d1-mock.ts __tests__/unit/lib/db/product-drafts.test.ts
git commit -m "feat(db): draft-only product persistence for the MCP tools"
```

---

### Task 8: `product-drafts` — images and colour variants

**Files:**
- Modify: `lib/db/product-drafts.ts` (replace the Task 7 trailing exports)
- Test: `__tests__/unit/lib/db/product-drafts-media.test.ts`

**Interfaces:**
- Consumes: `fetchAndUploadImage(draftId, url): Promise<FetchImageResult>` from `@/lib/ai/image-fetch` (returns `{ ok: true, key }` or `{ ok: false, reason }`).
- Produces (from `@/lib/db/product-drafts`):
  - `addImagesFromUrls(id: string, images: AddImagesInput["images"]): Promise<{ results: ImageImportResult[]; primary_image_id: string | null }>`
  - `removeImage(id: string, imageId: string): Promise<void>`
  - `setColorVariants(id: string, input: SetVariantsInput): Promise<{ variants: VariantRow[]; stock_quantity: number }>`
  - types `ImageImportResult = { url: string; ok: boolean; image_id?: string; reason?: string }`, `VariantRow = { id: string; color_name: string; color_hex: string; price: number; stock: number }`

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/lib/db/product-drafts-media.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createD1Mock, type BoundStatement } from "../../../helpers/d1-mock";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));
const mocks = vi.hoisted(() => ({ deleteFromR2: vi.fn(), fetchAndUploadImage: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: mocks.deleteFromR2, uploadToR2: vi.fn() }));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));

import { addImagesFromUrls, removeImage, setColorVariants } from "@/lib/db/product-drafts";

const sqlOf = (s: BoundStatement) => s.sql.replace(/\s+/g, " ");
const DRAFT_ROW = [["p1", "slug"]];

beforeEach(() => {
  d1.current = createD1Mock();
  mocks.deleteFromR2.mockReset().mockResolvedValue(undefined);
  mocks.fetchAndUploadImage.mockReset().mockImplementation(async (_id: string, url: string) =>
    ({ ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));
});

describe("addImagesFromUrls", () => {
  it("refuse au-delà de 12 images au total, avant tout téléchargement", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql)) return Array.from({ length: 11 }, (_, i) => [`img-${i}`, i === 0 ? 1 : 0, i]);
      return [];
    });
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }]))
      .rejects.toMatchObject({ code: "limit_exceeded" });
    expect(mocks.fetchAndUploadImage).not.toHaveBeenCalled();
  });

  it("insère les images réussies, marque la première primaire, rapporte les échecs", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    mocks.fetchAndUploadImage.mockImplementation(async (_id: string, url: string) =>
      url.endsWith("bad.jpg") ? { ok: false, reason: "bad_status", status: 404 }
        : { ok: true, key: `products/p1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 1 });

    const r = await addImagesFromUrls("p1", [{ url: "https://x/bad.jpg" }, { url: "https://x/a.jpg", alt: "A" }, { url: "https://x/b.jpg" }]);

    expect(r.results).toEqual([
      { url: "https://x/bad.jpg", ok: false, reason: "bad_status" },
      { url: "https://x/a.jpg", ok: true, image_id: expect.any(String) },
      { url: "https://x/b.jpg", ok: true, image_id: expect.any(String) },
    ]);
    expect(r.primary_image_id).toBe(r.results[1].image_id);
    const inserts = d1.current!.batchStatements().filter((s) => /insert into "product_images"/i.test(s.sql));
    expect(inserts).toHaveLength(2);
    expect(inserts[0].params).toEqual(expect.arrayContaining(["products/p1/a.jpg", "A", 1, 0]));  // is_primary 1, sort 0
    expect(inserts[1].params).toEqual(expect.arrayContaining(["products/p1/b.jpg", 0, 1]));
  });

  it("garde la primaire existante et poursuit le sort_order", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql)) return [["img-0", 1, 0], ["img-1", 0, 4]];
      return [];
    });
    const r = await addImagesFromUrls("p1", [{ url: "https://x/c.jpg" }]);
    expect(r.primary_image_id).toBe("img-0");
    const insert = d1.current!.batchStatements()[0];
    expect(insert.params).toEqual(expect.arrayContaining([0, 5]));
  });

  it("nettoie R2 si le batch échoue", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    d1.current!.batch.mockRejectedValue(new Error("D1 down"));
    await expect(addImagesFromUrls("p1", [{ url: "https://x/a.jpg" }])).rejects.toThrow("D1 down");
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });
});

describe("removeImage", () => {
  it("supprime la ligne, promeut la suivante en primaire et efface l'objet R2", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/"is_draft" = \?/i.test(stmt.sql)) return DRAFT_ROW;
      if (/from "product_images"/i.test(stmt.sql) && /"id" = \?/i.test(stmt.sql)) return [["img-0", "products/p1/a.jpg", 1]];
      if (/from "product_images"/i.test(stmt.sql)) return [["img-1"]];
      return [];
    });
    await removeImage("p1", "img-0");
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts[0]).toMatch(/delete from "product_images"/i);
    expect(stmts[1]).toMatch(/update "product_images" set "is_primary" = \?/i);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("products/p1/a.jpg");
  });

  it("lève not_found pour une image d'un autre produit", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/"is_draft" = \?/i.test(stmt.sql) ? DRAFT_ROW : []));
    await expect(removeImage("p1", "img-x")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("setColorVariants", () => {
  // select({ id, slug, base_price, compare_price }) → positional row
  const PRODUCT_ROW = [["p1", "slug", 100000, 120000]];

  it("crée, met à jour et supprime les variantes couleur, et recalcule le stock", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => {
      if (/from "products"/i.test(stmt.sql)) return PRODUCT_ROW;
      if (/from "product_variants"/i.test(stmt.sql) && /"attributes"/i.test(stmt.sql)) {
        return [["v-noir", JSON.stringify({ color: "Noir:#000000" })], ["v-bleu", JSON.stringify({ color: "Bleu:#0000ff" })]];
      }
      return [];
    });

    const r = await setColorVariants("p1", {
      uniform_price: false,
      variants: [
        { color_name: "Noir", color_hex: "#000000", stock: 2, price: 90000 },
        { color_name: "Rouge", color_hex: "#ff0000", stock: 3 },
      ],
    });

    expect(r.stock_quantity).toBe(5);
    const stmts = d1.current!.batchStatements().map(sqlOf);
    expect(stmts.some((s) => /update "product_variants" set/i.test(s))).toBe(true);        // Noir
    expect(stmts.some((s) => /insert into "product_variants"/i.test(s))).toBe(true);      // Rouge
    expect(stmts.some((s) => /update "product_images" set "variant_id" = \?/i.test(s))).toBe(true); // Bleu images detached
    expect(stmts.some((s) => /delete from "product_variants" where "product_variants"."id" = \?/i.test(s))).toBe(true); // Bleu
    expect(stmts[stmts.length - 1]).toMatch(/update "products" set "stock_quantity" = \?.*"is_draft" = \?/i);
    const rougeInsert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(rougeInsert.params).toEqual(expect.arrayContaining(["Rouge", 100000, JSON.stringify({ color: "Rouge:#ff0000" })])); // price → base_price
  });

  it("applique le prix de base à toutes les variantes en uniform_price", async () => {
    d1.current!.raw.mockImplementation(async (stmt) => (/from "products"/i.test(stmt.sql) ? PRODUCT_ROW : []));
    await setColorVariants("p1", { uniform_price: true, variants: [{ color_name: "Noir", color_hex: "#000000", stock: 1, price: 5 }] });
    const insert = d1.current!.batchStatements().find((s) => /insert into "product_variants"/i.test(s.sql))!;
    expect(insert.params).toEqual(expect.arrayContaining([100000, 120000]));
    expect(insert.params).not.toContain(5);
  });

  it("refuse un produit publié", async () => {
    await expect(setColorVariants("p1", { uniform_price: true, variants: [] })).rejects.toMatchObject({ code: "not_found" });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run __tests__/unit/lib/db/product-drafts-media.test.ts
```

Expected: FAIL, `addImagesFromUrls` is not exported.

- [ ] **Step 3: Implement (replace the trailing placeholder exports of Task 7)**

Delete the two lines after `// ─── Images and variants: see Task 8 ───` in `lib/db/product-drafts.ts` and append:

```ts
// ─── Images ───

export interface ImageImportResult {
  url: string;
  ok: boolean;
  image_id?: string;
  reason?: string;
}

type FetchSuccess = Extract<FetchImageResult, { ok: true }>;

export async function addImagesFromUrls(
  id: string,
  images: AddImagesInput["images"],
): Promise<{ results: ImageImportResult[]; primary_image_id: string | null }> {
  const db = await getDrizzle();
  await requireDraft(db, id);

  const existing = await db
    .select({ id: productImages.id, is_primary: productImages.is_primary, sort_order: productImages.sort_order })
    .from(productImages)
    .where(eq(productImages.product_id, id))
    .all();

  if (existing.length + images.length > MAX_IMAGES_PER_PRODUCT) {
    throw new DraftError(
      "limit_exceeded",
      `Au plus ${MAX_IMAGES_PER_PRODUCT} images par produit (${existing.length} déjà présentes)`,
    );
  }

  const fetched = await Promise.all(
    images.map(async (img) => ({ img, r: await fetchAndUploadImage(id, img.url) })),
  );
  const succeeded = fetched.filter((x): x is { img: typeof x.img; r: FetchSuccess } => x.r.ok);

  let primaryId: string | null = existing.find((e) => e.is_primary === 1)?.id ?? null;
  let nextSort = existing.reduce((max, e) => Math.max(max, e.sort_order + 1), 0);

  const idByUrl = new Map<string, string>();
  const stmts: Statement[] = [];
  for (const { img, r } of succeeded) {
    const imageId = nanoid();
    idByUrl.set(img.url, imageId);
    const isPrimary = primaryId === null ? 1 : 0;
    if (isPrimary) primaryId = imageId;
    stmts.push(
      db.insert(productImages).values({
        id: imageId,
        product_id: id,
        url: r.key,
        alt: img.alt ?? null,
        is_primary: isPrimary,
        sort_order: nextSort++,
        created_at: sql`datetime('now')`,
      }),
    );
  }

  if (stmts.length > 0) {
    try {
      await db.batch(stmts as Batch);
    } catch (err) {
      console.error("[product-drafts] image batch failed, cleaning R2", { id }, err);
      await Promise.allSettled(succeeded.map(({ r }) => deleteFromR2(r.key)));
      throw err;
    }
  }

  const results: ImageImportResult[] = fetched.map(({ img, r }) =>
    r.ok ? { url: img.url, ok: true, image_id: idByUrl.get(img.url) } : { url: img.url, ok: false, reason: r.reason },
  );
  if (fetched.some((f) => !f.r.ok)) {
    console.error("[product-drafts] image fetch failures", { id }, results.filter((x) => !x.ok));
  }
  return { results, primary_image_id: primaryId };
}

export async function removeImage(id: string, imageId: string): Promise<void> {
  const db = await getDrizzle();
  await requireDraft(db, id);

  const img = await db
    .select({ id: productImages.id, url: productImages.url, is_primary: productImages.is_primary })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.product_id, id)))
    .limit(1)
    .get();
  if (!img) throw new DraftError("not_found", "Image introuvable sur ce brouillon");

  const stmts: Batch = [db.delete(productImages).where(eq(productImages.id, imageId))];
  if (img.is_primary === 1) {
    const next = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.product_id, id), ne(productImages.id, imageId)))
      .orderBy(asc(productImages.sort_order))
      .limit(1)
      .get();
    if (next) stmts.push(db.update(productImages).set({ is_primary: 1 }).where(eq(productImages.id, next.id)));
  }
  await db.batch(stmts);

  await deleteFromR2(r2KeyFromImageUrl(img.url)).catch((e) => {
    console.warn("[product-drafts] orphan R2 object after removeImage", img.url, e);
  });
}

// ─── Colour variants ───

export interface VariantRow {
  id: string;
  color_name: string;
  color_hex: string;
  price: number;
  stock: number;
}

/** Wizard convention (step-pricing.tsx): `{ color: "<name>:<#hex>" }`. */
function colorKey(name: string, hex: string): string {
  return `${name}:${hex}`;
}

/** Port of actions/admin/products.ts saveColorVariants, Drizzle + draft-only. */
export async function setColorVariants(
  id: string,
  input: SetVariantsInput,
): Promise<{ variants: VariantRow[]; stock_quantity: number }> {
  const db = await getDrizzle();
  const product = await db
    .select({ id: products.id, slug: products.slug, base_price: products.base_price, compare_price: products.compare_price })
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!product) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");

  const existing = await db
    .select({ id: productVariants.id, attributes: productVariants.attributes })
    .from(productVariants)
    .where(eq(productVariants.product_id, id))
    .all();

  // Only colour-only variants (single "color" key) are managed here.
  const existingByColor = new Map<string, string>();
  for (const v of existing) {
    try {
      const attrs = JSON.parse(v.attributes) as Record<string, unknown>;
      const keys = Object.keys(attrs);
      if (keys.length === 1 && keys[0] === "color" && typeof attrs.color === "string") existingByColor.set(attrs.color, v.id);
    } catch (e) {
      console.error("[product-drafts] malformed variant attributes", v.id, e);
    }
  }

  const stmts: Statement[] = [];
  const out: VariantRow[] = [];
  const seen = new Set<string>();
  let total = 0;

  input.variants.forEach((entry, index) => {
    const key = colorKey(entry.color_name, entry.color_hex);
    seen.add(key);
    const price = input.uniform_price || entry.price == null ? product.base_price : entry.price;
    const comparePrice = input.uniform_price ? product.compare_price : null;
    const attrs = JSON.stringify({ color: key });
    total += entry.stock;

    const existingId = existingByColor.get(key);
    const variantId = existingId ?? nanoid();
    if (existingId) {
      stmts.push(
        db.update(productVariants)
          .set({ name: entry.color_name, price, compare_price: comparePrice, stock_quantity: entry.stock, attributes: attrs })
          .where(eq(productVariants.id, existingId)),
      );
    } else {
      stmts.push(
        db.insert(productVariants).values({
          id: variantId, product_id: id, name: entry.color_name, price, compare_price: comparePrice,
          stock_quantity: entry.stock, attributes: attrs, is_active: 1, sort_order: index,
          created_at: sql`datetime('now')`,
        }),
      );
    }
    out.push({ id: variantId, color_name: entry.color_name, color_hex: entry.color_hex, price, stock: entry.stock });
  });

  for (const [key, variantId] of existingByColor) {
    if (seen.has(key)) continue;
    stmts.push(db.update(productImages).set({ variant_id: null }).where(eq(productImages.variant_id, variantId)));
    stmts.push(db.delete(productVariants).where(eq(productVariants.id, variantId)));
  }

  stmts.push(
    db.update(products)
      .set({ stock_quantity: total, updated_at: sql`datetime('now')` })
      .where(and(eq(products.id, id), eq(products.is_draft, 1))),
  );

  await db.batch(stmts as Batch);
  return { variants: out, stock_quantity: total };
}
```

- [ ] **Step 4: Run both draft test files**

```bash
npx vitest run __tests__/unit/lib/db/product-drafts.test.ts __tests__/unit/lib/db/product-drafts-media.test.ts
```

Expected: all pass. If a positional-row assertion fails, print `d1.current!.bound.mock.calls` and align the mocked row with the `select({...})` column order in the implementation; the column order is the contract.

- [ ] **Step 5: Lint, type-check, commit**

```bash
npx tsc --noEmit && npx eslint lib/db/product-drafts.ts __tests__/unit/lib/db/product-drafts-media.test.ts
git add lib/db/product-drafts.ts __tests__/unit/lib/db/product-drafts-media.test.ts
git commit -m "feat(db): draft images and colour variants for the MCP tools"
```

---

### Task 9: MCP result helpers and admin context

**Files:**
- Create: `lib/mcp/result.ts`
- Create: `lib/mcp/context.ts`
- Test: `__tests__/unit/lib/mcp/result.test.ts`
- Test: `__tests__/unit/lib/mcp/context.test.ts`

**Interfaces:**
- Consumes: `isActivelyBanned` from `@/lib/auth/ban`; `user` table.
- Produces:
  - `lib/mcp/result.ts`: `type McpErrorCode`, `type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean }`, `ok(data: unknown): ToolResult`, `fail(code, message, fieldErrors?): ToolResult`
  - `lib/mcp/context.ts`: `interface McpContext { user: { id: string; name: string; role: "admin" | "super_admin" }; clientId: string }`, `class McpAuthError extends Error { status: 403 }`, `buildMcpContext(session: { userId?: string | null; clientId: string }): Promise<McpContext>`

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/lib/mcp/result.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/mcp/result";

describe("mcp result helpers", () => {
  it("ok sérialise la donnée en texte JSON", () => {
    const r = ok({ id: "p1" });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(r.content[0].text)).toEqual({ id: "p1" });
  });

  it("fail porte code, message et fieldErrors", () => {
    const r = fail("validation_error", "Nom requis", { name: ["Requis"] });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text)).toEqual({ code: "validation_error", message: "Nom requis", fieldErrors: { name: ["Requis"] } });
  });
});
```

`__tests__/unit/lib/mcp/context.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const d1 = vi.hoisted(() => ({
  current: null as null | ReturnType<typeof import("../../../helpers/d1-mock").createD1Mock>,
}));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => d1.current!.binding }));

import { createD1Mock } from "../../../helpers/d1-mock";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";

// select({ id, name, role, banned, banExpires }) → positional row
const row = (role: string, banned = 0, banExpires: string | null = null) => [["u1", "Admin", role, banned, banExpires]];

beforeEach(() => { d1.current = createD1Mock(); });

describe("buildMcpContext", () => {
  it("accepte admin et super_admin", async () => {
    d1.current!.raw.mockResolvedValue(row("admin"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toEqual({
      user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c1",
    });
    d1.current!.raw.mockResolvedValue(row("super_admin"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toMatchObject({ user: { role: "super_admin" } });
  });

  it("refuse customer et agent", async () => {
    d1.current!.raw.mockResolvedValue(row("customer"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue(row("agent"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
  });

  it("refuse un admin banni, accepte un ban expiré", async () => {
    d1.current!.raw.mockResolvedValue(row("admin", 1, null));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue(row("admin", 1, "2000-01-01T00:00:00.000Z"));
    await expect(buildMcpContext({ userId: "u1", clientId: "c1" })).resolves.toBeDefined();
  });

  it("refuse un jeton sans utilisateur ou un utilisateur supprimé", async () => {
    await expect(buildMcpContext({ userId: null, clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
    d1.current!.raw.mockResolvedValue([]);
    await expect(buildMcpContext({ userId: "gone", clientId: "c1" })).rejects.toBeInstanceOf(McpAuthError);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run __tests__/unit/lib/mcp
```

Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `result.ts`**

`lib/mcp/result.ts`:

```ts
export type McpErrorCode = "validation_error" | "not_found" | "conflict" | "limit_exceeded" | "internal_error";

/** Shape the MCP SDK expects back from a tool handler (text content only in phase 1). */
export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function fail(code: McpErrorCode, message: string, fieldErrors?: Record<string, string[]>): ToolResult {
  const body: Record<string, unknown> = { code, message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return { content: [{ type: "text", text: JSON.stringify(body) }], isError: true };
}
```

- [ ] **Step 4: Implement `context.ts`**

`lib/mcp/context.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests, lint, type-check**

```bash
npx vitest run __tests__/unit/lib/mcp && npx tsc --noEmit && npx eslint lib/mcp
```

Expected: all pass, clean. If `isActivelyBanned(row)` fails typing, pass `{ banned: row.banned, banExpires: row.banExpires }` — its parameter type accepts `BanFlag`/`BanExpiry` (lib/auth/ban.ts).

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/result.ts lib/mcp/context.ts __tests__/unit/lib/mcp
git commit -m "feat(admin): MCP tool result helpers and admin context guard"
```

---

### Task 10: Tool definitions and server factory

**Files:**
- Create: `lib/mcp/tools/types.ts`
- Create: `lib/mcp/tools/categories.ts`
- Create: `lib/mcp/tools/products.ts`
- Create: `lib/mcp/server.ts`
- Test: `__tests__/unit/lib/mcp/tools-products.test.ts`
- Test: `__tests__/unit/lib/mcp/server.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 5–9; `getCategoryTree` from `@/lib/db/categories`; `createAuditLog` from `@/lib/db/admin/audit-log`.
- Produces:
  - `lib/mcp/tools/types.ts`: `interface ToolDefinition<Shape extends ZodRawShape> { name: string; description: string; inputSchema: Shape; handler: (ctx: McpContext, input: z.infer<z.ZodObject<Shape>>) => Promise<ToolResult> }` and `defineTool()`
  - `lib/mcp/tools/products.ts`: `productTools: ToolDefinition<any>[]`; `lib/mcp/tools/categories.ts`: `categoryTools`
  - `lib/mcp/server.ts`: `createMcpServer(ctx: McpContext): McpServer`, `ALL_TOOLS`

- [ ] **Step 1: Write the failing tool tests**

`__tests__/unit/lib/mcp/tools-products.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpContext } from "@/lib/mcp/context";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(), updateDraft: vi.fn(), getDraft: vi.fn(), searchProducts: vi.fn(), deleteDraft: vi.fn(),
  addImagesFromUrls: vi.fn(), removeImage: vi.fn(), setColorVariants: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/db/product-drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/product-drafts")>("@/lib/db/product-drafts");
  return { ...actual, ...mocks };
});
vi.mock("@/lib/db/admin/audit-log", () => ({ createAuditLog: mocks.createAuditLog }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB in this test"); } }));

import { DraftError } from "@/lib/db/product-drafts";
import { productTools } from "@/lib/mcp/tools/products";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
// productTools is typed ToolDefinition[] (base shape), so handler accepts any object literal here.
const tool = (name: string) => productTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createAuditLog.mockResolvedValue(undefined);
});

describe("productTools", () => {
  it("expose exactement les outils du contrat", () => {
    expect(productTools.map((t) => t.name).sort()).toEqual([
      "add_product_images", "create_product_draft", "delete_product_draft", "get_product_draft",
      "remove_product_image", "search_products", "set_product_variants", "update_product_draft",
    ]);
  });

  it("create_product_draft renvoie id, slug, edit_url et écrit l'audit", async () => {
    mocks.createDraft.mockResolvedValue({ id: "p1", slug: "galaxy-a55" });
    const r = await tool("create_product_draft").handler(ctx, { name: "Galaxy A55", category_id: "cat-1" });
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toEqual({ id: "p1", slug: "galaxy-a55", edit_url: "/products/p1/edit" });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1", actorName: "Admin", action: "product.draft_created", targetType: "product", targetId: "p1",
      details: JSON.stringify({ via: "mcp", tool: "create_product_draft", client_id: "client-1" }),
    }));
  });

  it("mappe DraftError vers un résultat isError avec le code", async () => {
    mocks.updateDraft.mockRejectedValue(new DraftError("not_found", "Brouillon introuvable"));
    const r = await tool("update_product_draft").handler(ctx, { id: "p1", name: "X" });
    expect(r.isError).toBe(true);
    expect(parse(r)).toEqual({ code: "not_found", message: "Brouillon introuvable" });
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("mappe une erreur inattendue vers internal_error sans détail", async () => {
    mocks.getDraft.mockRejectedValue(new Error("D1 exploded with secret details"));
    const r = await tool("get_product_draft").handler(ctx, { id: "p1" });
    expect(r.isError).toBe(true);
    expect(parse(r).code).toBe("internal_error");
    expect(parse(r).message).not.toContain("secret");
  });

  it("add_product_images rapporte un succès partiel sans isError", async () => {
    mocks.addImagesFromUrls.mockResolvedValue({
      results: [{ url: "https://x/a.jpg", ok: true, image_id: "img-1" }, { url: "https://x/b.jpg", ok: false, reason: "too_large" }],
      primary_image_id: "img-1",
    });
    const r = await tool("add_product_images").handler(ctx, { id: "p1", images: [{ url: "https://x/a.jpg" }, { url: "https://x/b.jpg" }] });
    expect(r.isError).toBeUndefined();
    expect(parse(r).results[1]).toEqual({ url: "https://x/b.jpg", ok: false, reason: "too_large" });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "product.draft_updated" }));
  });

  it("delete_product_draft audite la suppression", async () => {
    mocks.deleteDraft.mockResolvedValue(undefined);
    const r = await tool("delete_product_draft").handler(ctx, { id: "p1" });
    expect(parse(r)).toEqual({ deleted: true });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "product.draft_deleted", targetId: "p1" }));
  });

  it("search_products délègue avec la limite", async () => {
    mocks.searchProducts.mockResolvedValue([]);
    await tool("search_products").handler(ctx, { query: "galaxy", limit: 7 });
    expect(mocks.searchProducts).toHaveBeenCalledWith("galaxy", 7);
  });
});
```

`__tests__/unit/lib/mcp/server.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { ALL_TOOLS, createMcpServer } from "@/lib/mcp/server";

describe("createMcpServer", () => {
  it("enregistre tous les outils avec description et schéma", () => {
    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    expect(server).toBeDefined();
    expect(ALL_TOOLS.length).toBe(9);
    for (const t of ALL_TOOLS) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(typeof t.inputSchema).toBe("object");
    }
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run __tests__/unit/lib/mcp/tools-products.test.ts __tests__/unit/lib/mcp/server.test.ts
```

Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `tools/types.ts`**

`lib/mcp/tools/types.ts`:

```ts
import type { z, ZodRawShape } from "zod";
import type { McpContext } from "@/lib/mcp/context";
import type { ToolResult } from "@/lib/mcp/result";

/**
 * One MCP tool. `inputSchema` is a raw Zod shape (what the SDK's registerTool
 * takes); the SDK validates and rejects invalid params with JSON-RPC -32602
 * before `handler` runs.
 */
export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: Shape;
  handler: (ctx: McpContext, input: z.infer<z.ZodObject<Shape>>) => Promise<ToolResult>;
}

/**
 * Infers the handler's input type from the shape, then widens to the base
 * ToolDefinition so heterogeneous tools can live in one array. The widening
 * is a cast because handler parameters are contravariant under
 * strictFunctionTypes; the SDK re-validates the input at runtime anyway.
 */
export function defineTool<Shape extends ZodRawShape>(def: ToolDefinition<Shape>): ToolDefinition {
  return def as unknown as ToolDefinition;
}
```

- [ ] **Step 4: Implement `tools/categories.ts`**

`lib/mcp/tools/categories.ts`:

```ts
import { getCategoryTree } from "@/lib/db/categories";
import type { CategoryNode } from "@/lib/db/types";
import { ok, fail } from "@/lib/mcp/result";
import { defineTool, type ToolDefinition } from "./types";

interface CategoryOut { id: string; name: string; slug: string; children: CategoryOut[] }

function strip(nodes: readonly CategoryNode[]): CategoryOut[] {
  return nodes.map((n) => ({ id: n.id, name: n.name, slug: n.slug, children: strip(n.children) }));
}

export const categoryTools: ToolDefinition[] = [
  defineTool({
    name: "list_categories",
    description:
      "Liste l'arbre des catégories actives de la boutique (2 niveaux max). Utilise l'id retourné comme category_id pour create_product_draft.",
    inputSchema: {},
    handler: async () => {
      try {
        return ok(strip(await getCategoryTree()));
      } catch (err) {
        console.error("[mcp/list_categories]", err);
        return fail("internal_error", "Impossible de lire les catégories");
      }
    },
  }),
];
```

- [ ] **Step 5: Implement `tools/products.ts`**

`lib/mcp/tools/products.ts`:

```ts
import { createAuditLog } from "@/lib/db/admin/audit-log";
import type { AuditAction } from "@/lib/db/types";
import {
  DraftError,
  addImagesFromUrls,
  createDraft,
  deleteDraft,
  getDraft,
  removeImage,
  searchProducts,
  setColorVariants,
  updateDraft,
} from "@/lib/db/product-drafts";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type ToolResult } from "@/lib/mcp/result";
import {
  addImagesSchema,
  createDraftSchema,
  idSchema,
  searchProductsSchema,
  setVariantsSchema,
  updateDraftSchema,
} from "@/lib/validations/mcp-product";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Product-draft tools. Every write goes through lib/db/product-drafts.ts,
 * which refuses anything that is not `is_draft = 1`. Publishing stays in the
 * admin wizard (/products/<id>/edit) — no tool here can flip is_draft/is_active.
 */

function toolError(toolName: string, err: unknown): ToolResult {
  if (err instanceof DraftError) return fail(err.code, err.message);
  console.error(`[mcp/${toolName}]`, err);
  return fail("internal_error", "Erreur interne, réessayez ou contactez un administrateur");
}

async function audit(ctx: McpContext, tool: string, action: AuditAction, productId: string): Promise<void> {
  try {
    await createAuditLog({
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action,
      targetType: "product",
      targetId: productId,
      details: JSON.stringify({ via: "mcp", tool, client_id: ctx.clientId }),
    });
  } catch (err) {
    // The write already succeeded; losing the audit row must not fail the tool.
    console.error(`[mcp/${tool}] audit log failed`, { productId }, err);
  }
}

const DESCRIPTION_RULES =
  "Champs : name (requis), category_id (requis, voir list_categories), brand, short_description (≤120), description_html (HTML, assaini côté serveur), story {tagline, highlights[3-6] {icon,label}, feature_blocks[2-4] {title,body}, faq[≤5] {question,answer}}, seo {meta_title ≤60, meta_description ≤160}, attributes {colors[{name,hex}], dimensions {length_mm,height_mm,width_mm,weight_g}, specs[{name,value}]}, pricing {base_price, compare_price, sku, stock_quantity, low_stock_threshold, weight_grams} (prix en XOF entiers).";

export const productTools: ToolDefinition[] = [
  defineTool({
    name: "search_products",
    description:
      "Recherche des produits (brouillons et publiés) par nom, slug ou SKU. À appeler avant create_product_draft pour éviter les doublons.",
    inputSchema: searchProductsSchema.shape,
    handler: async (_ctx, input) => {
      try {
        return ok(await searchProducts(input.query, input.limit));
      } catch (err) {
        return toolError("search_products", err);
      }
    },
  }),

  defineTool({
    name: "get_product_draft",
    description: "Relit un brouillon complet : champs, attributs, images (URL publiques), variantes. Échoue sur un produit publié.",
    inputSchema: { id: idSchema },
    handler: async (_ctx, input) => {
      try {
        return ok(await getDraft(input.id));
      } catch (err) {
        return toolError("get_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "create_product_draft",
    description:
      `Crée un brouillon produit (non publié, invisible en boutique). Retourne {id, slug, edit_url}. ${DESCRIPTION_RULES} Les couleurs déclarées ici doivent correspondre à celles de set_product_variants.`,
    inputSchema: createDraftSchema.shape,
    handler: async (ctx, input) => {
      try {
        const { id, slug } = await createDraft(input);
        await audit(ctx, "create_product_draft", "product.draft_created", id);
        return ok({ id, slug, edit_url: `/products/${id}/edit` });
      } catch (err) {
        return toolError("create_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "update_product_draft",
    description:
      `Met à jour un brouillon. Champs absents ignorés, null efface. attributes fourni remplace tous les attributs. slug optionnel (unique). ${DESCRIPTION_RULES}`,
    inputSchema: { id: idSchema, ...updateDraftSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { id, ...patch } = input;
        const result = await updateDraft(id, patch);
        await audit(ctx, "update_product_draft", "product.draft_updated", id);
        return ok(result);
      } catch (err) {
        return toolError("update_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "add_product_images",
    description:
      "Télécharge 1 à 8 images depuis des URL http(s) (≤5 Mo chacune, 12 max par produit) vers le stockage de la boutique et les attache au brouillon. Succès partiel possible : vérifier results[].ok. La première image du produit devient l'image principale.",
    inputSchema: { id: idSchema, ...addImagesSchema.shape },
    handler: async (ctx, input) => {
      try {
        const result = await addImagesFromUrls(input.id, input.images);
        if (result.results.some((r) => r.ok)) await audit(ctx, "add_product_images", "product.draft_updated", input.id);
        return ok(result);
      } catch (err) {
        return toolError("add_product_images", err);
      }
    },
  }),

  defineTool({
    name: "remove_product_image",
    description: "Retire une image d'un brouillon (ligne et fichier). Si elle était principale, la suivante le devient.",
    inputSchema: { id: idSchema, image_id: idSchema },
    handler: async (ctx, input) => {
      try {
        await removeImage(input.id, input.image_id);
        await audit(ctx, "remove_product_image", "product.draft_updated", input.id);
        return ok({ removed: true });
      } catch (err) {
        return toolError("remove_product_image", err);
      }
    },
  }),

  defineTool({
    name: "set_product_variants",
    description:
      "Définit les variantes couleur d'un brouillon (remplace l'ensemble). price absent ou uniform_price=true → prix de base du produit. Les variantes retirées sont supprimées. Le stock du produit devient la somme des stocks. Déclarer les mêmes couleurs dans attributes.colors.",
    inputSchema: { id: idSchema, ...setVariantsSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { id, ...rest } = input;
        const result = await setColorVariants(id, rest);
        await audit(ctx, "set_product_variants", "product.draft_updated", id);
        return ok(result);
      } catch (err) {
        return toolError("set_product_variants", err);
      }
    },
  }),

  defineTool({
    name: "delete_product_draft",
    description: "Supprime définitivement un brouillon et ses images. Impossible sur un produit publié.",
    inputSchema: { id: idSchema },
    handler: async (ctx, input) => {
      try {
        await deleteDraft(input.id);
        await audit(ctx, "delete_product_draft", "product.draft_deleted", input.id);
        return ok({ deleted: true });
      } catch (err) {
        return toolError("delete_product_draft", err);
      }
    },
  }),
];
```

- [ ] **Step 6: Implement `server.ts`**

`lib/mcp/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "@/lib/mcp/context";
import { categoryTools } from "@/lib/mcp/tools/categories";
import { productTools } from "@/lib/mcp/tools/products";
import type { ToolDefinition } from "@/lib/mcp/tools/types";

export const MCP_SERVER_NAME = "netereka-admin";
export const MCP_SERVER_VERSION = "1.0.0";

export const ALL_TOOLS: ToolDefinition[] = [...categoryTools, ...productTools];

/**
 * One server per request (stateless transport) bound to the admin who owns
 * the OAuth token. Tools never see the token, only the resolved context.
 */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input) => tool.handler(ctx, input),
    );
  }
  return server;
}
```

- [ ] **Step 7: Run the tests, lint, type-check**

```bash
npx vitest run __tests__/unit/lib/mcp && npx tsc --noEmit && npx eslint lib/mcp
```

Expected: all pass. Known typing friction point and its fix:
- If `registerTool` rejects `tool.inputSchema` (generic `ZodRawShape` vs the SDK's `ZodRawShapeCompat`) or the handler's `input` type, cast at the call site only: `inputSchema: tool.inputSchema as never` and `tool.handler(ctx, input as never)` — the runtime shape is what matters and the SDK validates it.

- [ ] **Step 8: Commit**

```bash
git add lib/mcp/tools lib/mcp/server.ts __tests__/unit/lib/mcp/tools-products.test.ts __tests__/unit/lib/mcp/server.test.ts
git commit -m "feat(admin): MCP product-draft tools and server factory"
```

---

### Task 11: `POST /api/mcp` route

**Files:**
- Create: `app/api/mcp/route.ts`
- Test: `__tests__/unit/api/mcp-route.test.ts`

**Interfaces:**
- Consumes: `withMcpAuth` from `better-auth/plugins`; `initAuth` from `@/lib/auth`; `buildMcpContext`, `McpAuthError` (Task 9); `createMcpServer` (Task 10); `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`.

- [ ] **Step 1: Write the failing route test**

`__tests__/unit/api/mcp-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getMcpSession: vi.fn(),
  buildMcpContext: vi.fn(),
}));

// withMcpAuth (real, from better-auth) calls auth.api.getMcpSession and needs auth.options.
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    options: { baseURL: "https://netereka.ci", basePath: "/api/auth" },
    api: { getMcpSession: mocks.getMcpSession },
  }),
}));
vi.mock("@/lib/mcp/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/context")>("@/lib/mcp/context");
  return { ...actual, buildMcpContext: mocks.buildMcpContext };
});
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => { throw new Error("no DB"); } }));

import { McpAuthError } from "@/lib/mcp/context";
import { POST, GET, DELETE } from "@/app/api/mcp/route";

function rpc(body: unknown, token = "tok") {
  return new Request("https://netereka.ci/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const INIT = {
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
};
const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMcpSession.mockResolvedValue({ userId: "u1", clientId: "c1", scopes: "openid" });
  mocks.buildMcpContext.mockResolvedValue({ user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c1" });
});

describe("POST /api/mcp", () => {
  it("répond 401 avec WWW-Authenticate sans jeton valide", async () => {
    mocks.getMcpSession.mockResolvedValue(null);
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/resource_metadata=/);
    expect(mocks.buildMcpContext).not.toHaveBeenCalled();
  });

  it("répond 403 JSON-RPC quand le porteur du jeton n'est pas admin", async () => {
    mocks.buildMcpContext.mockRejectedValue(new McpAuthError("Accès réservé aux administrateurs"));
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toBe("Accès réservé aux administrateurs");
  });

  it("sert tools/list à un admin", async () => {
    const res = await POST(rpc(LIST));
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("create_product_draft");
    expect(names).toContain("list_categories");
    expect(names).toHaveLength(9);
  });

  it("accepte initialize sans identifiant de session (stateless)", async () => {
    const res = await POST(rpc(INIT));
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeNull();
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("netereka-admin");
  });
});

describe("GET/DELETE /api/mcp", () => {
  it("répondent 405", async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run __tests__/unit/api/mcp-route.test.ts
```

Expected: FAIL, route module not found.

- [ ] **Step 3: Implement the route**

`app/api/mcp/route.ts`:

```ts
import { withMcpAuth } from "better-auth/plugins";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { initAuth } from "@/lib/auth";
import { buildMcpContext, McpAuthError } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless).
 *
 * withMcpAuth validates the OAuth bearer token (401 + WWW-Authenticate
 * otherwise, which is how clients discover the OAuth flow). buildMcpContext
 * then enforces the business rule — active admin — before any server exists.
 * A fresh McpServer + transport per request: nothing to share between Workers
 * isolates, no session id to store.
 */
export const dynamic = "force-dynamic";

function jsonRpcError(status: number, code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await initAuth();
  const handler = withMcpAuth(auth, async (req, session) => {
    let ctx;
    try {
      ctx = await buildMcpContext({ userId: session.userId, clientId: session.clientId });
    } catch (err) {
      if (err instanceof McpAuthError) return jsonRpcError(403, -32000, err.message);
      console.error("[mcp] context build failed", err);
      return jsonRpcError(500, -32603, "Erreur interne");
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      // Plain JSON responses: tools answer in one shot, no server-push needed,
      // and it keeps the response cacheable-by-nobody and easy to test.
      enableJsonResponse: true,
    });
    const server = createMcpServer(ctx);
    await server.connect(transport);
    try {
      return await transport.handleRequest(req);
    } finally {
      // Stateless: release the per-request server once the response is built.
      void transport.close().catch(() => {});
    }
  });
  return handler(request);
}

// Stateless mode has no standalone SSE stream and no session to delete.
export async function GET(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}

export async function DELETE(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run __tests__/unit/api/mcp-route.test.ts
```

Expected: all pass. If `withMcpAuth`'s type rejects the mocked `auth` in the test, that is test-only: cast the resolved value `as never`. If the `initialize` test returns 406, add `accept: "application/json, text/event-stream"` (already in `rpc()`) — the transport requires both.

- [ ] **Step 5: Type-check, lint, full suite**

```bash
npx tsc --noEmit && npx eslint app/api/mcp && npx vitest run
```

Expected: clean, everything green.

- [ ] **Step 6: Local end-to-end with Claude Code as the first client**

```bash
npm run dev
```

In another terminal:

```bash
claude mcp add --transport http netereka-local http://localhost:3000/api/mcp
claude
```

Inside Claude Code run `/mcp`, pick `netereka-local`, authenticate. Expected sequence:

1. Browser opens `/admin/login?client_id=…&redirect_uri=…&response_type=code&…` (or the consent page directly if already signed in as admin).
2. After login, `/admin/mcp/consent?client_id=…&scope=…` shows the client name (Claude Code registers as "Claude Code" or similar) with **Autoriser** / **Refuser**.
3. **Autoriser** → browser lands on the client's localhost callback ("You can close this window"), Claude Code reports the server connected.
4. Ask Claude Code: "liste les catégories" → `list_categories` returns the tree.
5. Ask it to create a full draft (name, category, story, SEO, attributes, pricing) then `add_product_images` with two real image URLs and `set_product_variants` with two colours. Open `http://localhost:3000/products/<id>/edit`: every wizard step shows the data; publish from step 5.
6. Ask it to `update_product_draft` on the now-published id → error `not_found`. Same for `delete_product_draft`.
7. Sign out, sign in as `customer` (seed account), re-authenticate the MCP → tool calls return the 403 message.

If step 2 is skipped (code issued without consent page), the before hook is not merging the query: check `lib/auth/index.ts` returns `{ context: { query } }` and that `ctx.path` is `/mcp/authorize` (log it once). If step 1's login page shows "Une erreur est survenue" and stays, the `resumeUrl` branch in Task 4 is not reached: verify `getOAuthResumeUrl` sees the params (they must all be present in the URL better-auth redirected to).

Record the actual outcome of steps 1–7 in the commit message of Step 7.

- [ ] **Step 7: Commit**

```bash
git add app/api/mcp/route.ts __tests__/unit/api/mcp-route.test.ts
git commit -m "feat(admin): remote MCP endpoint at /api/mcp (OAuth, stateless, draft-only tools)"
```

---

### Task 12: Documentation, PR

**Files:**
- Modify: `CLAUDE.md` (new section after "## WhatsApp Integration")
- Modify: `docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md` (status line)

- [ ] **Step 1: Document the MCP server in CLAUDE.md**

Insert after the WhatsApp section:

```markdown
## Admin MCP Server

Remote MCP endpoint at `POST /api/mcp` (Streamable HTTP, stateless) for AI clients (claude.ai, Claude Desktop, Claude Code, ChatGPT, Cursor…). Spec: `docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md`.

- **Auth:** OAuth 2.1 via better-auth's `mcp` plugin (`lib/auth/index.ts`). Dynamic client registration is open, so `lib/auth/mcp-consent-hook.ts` forces `prompt=consent` on every `/mcp/authorize` and `/admin/mcp/consent` requires a human click — without it a signed-in admin could be phished into issuing a token silently. Do not remove the hook.
- **Authorization:** `lib/mcp/context.ts` re-reads the user from D1 on every request; only `admin`/`super_admin`, not banned. A `customer` can finish the OAuth flow but every call gets 403.
- **Tools:** `lib/mcp/tools/*.ts`, registered by `lib/mcp/server.ts`. All product writes go through `lib/db/product-drafts.ts`, whose every UPDATE/DELETE carries `is_draft = 1`. No tool can publish; that stays in the wizard.
- **Audit:** each write tool records `product.draft_*` in `audit_log` with `details.via = "mcp"`.
- **Local test:** `claude mcp add --transport http netereka-local http://localhost:3000/api/mcp`, then `/mcp` in Claude Code. Discovery documents: `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`.
- **Adding a tool:** `defineTool({ name, description, inputSchema: <zod raw shape>, handler })` in a `lib/mcp/tools/*.ts` file, add it to `ALL_TOOLS`, map domain errors to `fail(code, message)`; never let a stack trace reach the client.
```

- [ ] **Step 2: Update the spec status**

In the spec header change `**Statut :** Design validé, à implémenter` to `**Statut :** Implémenté (2026-09-02)`.

- [ ] **Step 3: Commit and open the PR**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md
git commit -m "docs(claude): document the admin MCP server"
git push -u origin feat/admin-mcp-server
gh pr create --title "feat(admin): remote MCP server for AI-driven product drafts" --body-file - <<'EOF'
## Summary

- Remote MCP endpoint `POST /api/mcp` (Streamable HTTP, stateless) so any MCP client (claude.ai, Claude Desktop, Claude Code, ChatGPT, Cursor…) can administer product drafts.
- OAuth 2.1 provider via better-auth's `mcp` plugin, with a forced consent page (`/admin/mcp/consent`) — required because dynamic client registration is open.
- 9 tools: `list_categories`, `search_products`, `get_product_draft`, `create_product_draft`, `update_product_draft`, `add_product_images`, `remove_product_image`, `set_product_variants`, `delete_product_draft`. All writes are draft-only by construction (`lib/db/product-drafts.ts`).
- Three additive OAuth tables (migration 0017). Existing in-app AI product creation is untouched.

Spec: `docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md`
Plan: `docs/superpowers/plans/2026-09-02-admin-mcp-server.md`

## Test plan

- [ ] `npm run test` green (unit: schemas, drafts module, context guard, tools, route, auth config)
- [ ] Local e2e with Claude Code (Task 11 step 6): login → consent → draft with images and variants → visible in wizard → publish from wizard → MCP refuses the published product
- [ ] `customer` account gets 403 on every tool
- [ ] After canary: connect a claude.ai custom connector to `https://netereka.ci/api/mcp`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015x8NA9A7Rc3sNLBSeUkC9g
EOF
```

---

## Self-review notes

- **Spec coverage:** §1 architecture → Tasks 9–11; §2 auth (plugin, forced consent, consent page, business authorization, login resume) → Tasks 2, 3, 4, 9, 11; §3 data → Task 1; §4 tool contract → Tasks 6, 7, 8, 10; §5 errors → Tasks 7, 8, 10, 11; §6 tests → every task plus Task 11 step 6. Audit rows: the spec named a new `lib/db/audit.ts`; the repo already has `lib/db/admin/audit-log.ts` with `createAuditLog()`, so the plan reuses it (Task 10) instead of adding a second writer.
- **Deviation from spec file list:** `lib/validations/product-ai.ts` gets three `export` keywords (Task 6) so the attribute schemas can be reused without duplication.
- **Type consistency:** `DraftError.code` ⊂ `McpErrorCode`; `ToolDefinition.handler(ctx, input)` signature used identically in Tasks 10 and 11; `buildMcpContext({ userId, clientId })` matches the `getMcpSession` row fields (`userId`, `clientId`) used by `withMcpAuth`.
