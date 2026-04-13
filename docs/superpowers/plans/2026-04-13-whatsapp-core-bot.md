# WhatsApp Core Bot — Implementation Plan (Phase 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Cloudflare Worker that receives WhatsApp messages, uses Gemma 4 (Workers AI) to understand them, and responds with product catalogue information from the shared D1 database.

**Architecture:** A standalone Cloudflare Worker (`workers/whatsapp/`) connects to Meta Cloud API via webhooks, manages conversation sessions in D1 and context in KV, and uses Workers AI (Gemma 4) with function calling to search the product catalogue. The Worker shares the same D1 database as the main Next.js app.

**Tech Stack:** Cloudflare Workers, Workers AI (Gemma 4), D1 (Drizzle ORM), KV, Meta WhatsApp Cloud API

**Phases overview:**
- **Phase 1 (this plan):** Schema + Worker + webhook + LLM + catalogue tools
- **Phase 2:** Cart tools + order creation + account linking + delivery zones
- **Phase 3:** Admin dashboard (config, conversations, analytics)
- **Phase 4:** Storefront WhatsApp buttons + proactive notifications + service binding

---

## File Structure

### New files

```
workers/whatsapp/
├── wrangler.jsonc                    # Worker config (D1, KV, AI bindings)
├── tsconfig.json                     # Worker-specific TS config
└── src/
    ├── index.ts                      # Worker entry (fetch handler, routes)
    ├── types.ts                      # Env interface, WhatsApp API types
    ├── crypto.ts                     # Webhook signature verification
    ├── whatsapp-api.ts               # Send messages via Meta Cloud API
    ├── webhook.ts                    # GET verification + POST message parsing
    ├── session.ts                    # Find/create WhatsApp session in D1
    ├── context.ts                    # KV conversation context (load/save)
    ├── llm.ts                        # Workers AI integration + system prompt
    ├── orchestrator.ts               # Message flow: receive → LLM → respond
    └── tools/
        ├── registry.ts               # Tool definitions + dispatch
        └── catalogue.ts              # search_products, get_product, get_categories

__tests__/unit/workers/whatsapp/
├── crypto.test.ts                    # Signature verification tests
├── webhook.test.ts                   # Webhook handler tests
├── session.test.ts                   # Session management tests
├── context.test.ts                   # KV context tests
├── llm.test.ts                       # LLM integration tests
└── tools/
    └── catalogue.test.ts             # Catalogue tool tests
```

### Modified files

```
lib/db/schema.ts                      # Add 4 new tables + channel field on orders
package.json                          # Add Worker dev/deploy scripts
```

---

## Task 1: Add WhatsApp tables to Drizzle schema

**Files:**
- Modify: `lib/db/schema.ts` (append after `stores` table, line ~407)

- [ ] **Step 1: Add `whatsappConfig` table**

```typescript
// =============================================================================
// WhatsApp Configuration
// =============================================================================
export const whatsappConfig = sqliteTable("whatsapp_config", {
  id: integer("id").primaryKey(),
  phone_number_id: text("phone_number_id").notNull(),
  access_token: text("access_token").notNull(),
  verify_token: text("verify_token").notNull(),
  webhook_secret: text("webhook_secret").notNull(),
  business_account_id: text("business_account_id"),
  admin_phones: text("admin_phones").notNull().default("[]"),
  is_active: integer("is_active").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
```

- [ ] **Step 2: Add `whatsappSessions` table**

```typescript
// =============================================================================
// WhatsApp Sessions
// =============================================================================
export const whatsappSessions = sqliteTable("whatsapp_sessions", {
  id: text("id").primaryKey(),
  wa_phone: text("wa_phone").unique().notNull(),
  user_id: text("user_id").references(() => user.id),
  otp_code: text("otp_code"),
  otp_expires_at: text("otp_expires_at"),
  is_verified: integer("is_verified").notNull().default(0),
  status: text("status", { enum: ["active", "escalated", "closed"] }).notNull().default("active"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_sessions_phone").on(table.wa_phone),
  index("idx_wa_sessions_user").on(table.user_id),
]);
```

- [ ] **Step 3: Add `whatsappCarts` table**

```typescript
// =============================================================================
// WhatsApp Carts
// =============================================================================
export const whatsappCarts = sqliteTable("whatsapp_carts", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => whatsappSessions.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id),
  variant_id: text("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_carts_session").on(table.session_id),
]);
```

- [ ] **Step 4: Add `whatsappMessages` table**

```typescript
// =============================================================================
// WhatsApp Messages
// =============================================================================
export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => whatsappSessions.id, { onDelete: "cascade" }),
  wa_message_id: text("wa_message_id"),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content").notNull(),
  message_type: text("message_type", { enum: ["text", "interactive", "template", "image", "system"] }).notNull().default("text"),
  metadata: text("metadata"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_messages_session").on(table.session_id),
  index("idx_wa_messages_created").on(table.created_at),
  index("idx_wa_messages_wa_id").on(table.wa_message_id),
]);
```

- [ ] **Step 5: Add `channel` field to `orders` table**

Add after the `promo_code_id` field (line ~247):

```typescript
  channel: text("channel", { enum: ["web", "whatsapp"] }).notNull().default("web"),
```

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(schema): add WhatsApp tables and order channel field"
```

---

## Task 2: Generate and run D1 migration

**Files:**
- Generated: `drizzle/XXXX_*.sql` (auto-generated by drizzle-kit)

- [ ] **Step 1: Generate migration SQL**

```bash
npm run db:generate
```

Expected: New `.sql` file in `drizzle/` with CREATE TABLE statements for the 4 new tables and ALTER TABLE for orders.channel.

- [ ] **Step 2: Review generated SQL**

Read the generated file in `drizzle/` and verify it creates:
- `whatsapp_config` table
- `whatsapp_sessions` table with indexes
- `whatsapp_carts` table with index
- `whatsapp_messages` table with indexes
- `channel` column on `orders` table

- [ ] **Step 3: Run migration locally**

```bash
npm run db:migrate
```

Expected: Migration applied successfully.

- [ ] **Step 4: Commit**

```bash
git add drizzle/ lib/db/schema.ts
git commit -m "feat(db): generate WhatsApp migration"
```

---

## Task 3: Set up Worker project structure

**Files:**
- Create: `workers/whatsapp/wrangler.jsonc`
- Create: `workers/whatsapp/tsconfig.json`
- Create: `workers/whatsapp/src/index.ts` (minimal stub)

- [ ] **Step 1: Create `workers/whatsapp/wrangler.jsonc`**

```jsonc
{
  "name": "netereka-whatsapp",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/index.ts",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "netereka-db",
      "database_id": "4f7ff29e-aa15-47a3-a01c-68792a90f9ba"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "35fe4cd4dd084a629f0ebe1a795064db"
    }
  ],
  "ai": {
    "binding": "AI"
  }
}
```

- [ ] **Step 2: Create `workers/whatsapp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": {
      "@db/*": ["../../lib/db/*"]
    }
  },
  "include": ["src/**/*.ts", "../../lib/db/schema.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create minimal `workers/whatsapp/src/index.ts`**

```typescript
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") {
      return new Response("Webhook endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: Verify Worker builds**

```bash
cd workers/whatsapp && npx wrangler deploy --dry-run
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/
git commit -m "feat(whatsapp): scaffold Worker project"
```

---

## Task 4: Define Worker types

**Files:**
- Create: `workers/whatsapp/src/types.ts`

- [ ] **Step 1: Create types file with Env and WhatsApp API types**

```typescript
// Re-export Env from index for convenience
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
}

// --- WhatsApp Webhook Types ---

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: IncomingMessage[];
    statuses?: MessageStatus[];
  };
  field: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "interactive" | "button";
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

// --- LLM Types ---

export interface ConversationContext {
  messages: ChatMessage[];
  intent?: string;
  last_activity: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// --- Session Types ---

export interface WhatsAppSession {
  id: string;
  wa_phone: string;
  user_id: string | null;
  is_verified: number;
  status: "active" | "escalated" | "closed";
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Update `workers/whatsapp/src/index.ts` to import Env from types**

Replace the Env interface in `index.ts` with:

```typescript
import type { Env } from "./types";
```

Remove the inline `Env` interface.

- [ ] **Step 3: Commit**

```bash
git add workers/whatsapp/src/
git commit -m "feat(whatsapp): define Worker types"
```

---

## Task 5: Implement webhook signature verification

**Files:**
- Create: `workers/whatsapp/src/crypto.ts`
- Test: `__tests__/unit/workers/whatsapp/crypto.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { verifySignature } from "../../../../workers/whatsapp/src/crypto";

describe("verifySignature", () => {
  const APP_SECRET = "test_app_secret";

  it("returns true for a valid signature", async () => {
    const body = '{"test":"data"}';
    // Compute expected HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `sha256=${hex}`;

    const result = await verifySignature(body, header, APP_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    const result = await verifySignature('{"test":"data"}', "sha256=invalid", APP_SECRET);
    expect(result).toBe(false);
  });

  it("returns false for missing signature header", async () => {
    const result = await verifySignature('{"test":"data"}', "", APP_SECRET);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/crypto.test.ts
```

Expected: FAIL — `verifySignature` not found.

- [ ] **Step 3: Implement `crypto.ts`**

```typescript
export async function verifySignature(
  body: string,
  signatureHeader: string,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const [algo, receivedHash] = signatureHeader.split("=");
  if (algo !== "sha256" || !receivedHash) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHash = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === receivedHash;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/crypto.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/crypto.ts __tests__/unit/workers/whatsapp/crypto.test.ts
git commit -m "feat(whatsapp): implement webhook signature verification"
```

---

## Task 6: Implement WhatsApp API client

**Files:**
- Create: `workers/whatsapp/src/whatsapp-api.ts`
- Test: `__tests__/unit/workers/whatsapp/whatsapp-api.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppAPI } from "../../../../workers/whatsapp/src/whatsapp-api";

describe("WhatsAppAPI", () => {
  let api: WhatsAppAPI;

  beforeEach(() => {
    api = new WhatsAppAPI("test_phone_id", "test_access_token");
    global.fetch = vi.fn();
  });

  it("sends a text message with correct payload", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    const result = await api.sendText("+2250700000000", "Hello!");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/test_phone_id/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_access_token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "+2250700000000",
          type: "text",
          text: { body: "Hello!" },
        }),
      })
    );
    expect(result).toEqual({ success: true, messageId: "wamid.123" });
  });

  it("returns error on API failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 })
    );

    const result = await api.sendText("+2250700000000", "Hello!");
    expect(result).toEqual({ success: false, error: "Invalid token" });
  });

  it("marks message as read", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await api.markAsRead("wamid.123");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/test_phone_id/messages",
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: "wamid.123",
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/whatsapp-api.test.ts
```

Expected: FAIL — `WhatsAppAPI` not found.

- [ ] **Step 3: Implement `whatsapp-api.ts`**

```typescript
const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export class WhatsAppAPI {
  private url: string;
  private headers: Record<string, string>;

  constructor(phoneNumberId: string, accessToken: string) {
    this.url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async sendText(
    to: string,
    body: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    };

    return this.send(payload);
  }

  async markAsRead(messageId: string): Promise<void> {
    await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  }

  private async send(
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const error = data.error as { message?: string } | undefined;
      return { success: false, error: error?.message ?? "Unknown API error" };
    }

    const messages = data.messages as { id: string }[] | undefined;
    return { success: true, messageId: messages?.[0]?.id };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/whatsapp-api.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/whatsapp-api.ts __tests__/unit/workers/whatsapp/whatsapp-api.test.ts
git commit -m "feat(whatsapp): implement WhatsApp API client"
```

---

## Task 7: Implement webhook handlers

**Files:**
- Create: `workers/whatsapp/src/webhook.ts`
- Test: `__tests__/unit/workers/whatsapp/webhook.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { handleVerification, parseIncomingMessages } from "../../../../workers/whatsapp/src/webhook";

describe("handleVerification", () => {
  it("returns challenge when verify token matches", () => {
    const url = new URL(
      "https://example.com/webhook?hub.mode=subscribe&hub.verify_token=my_token&hub.challenge=test_challenge"
    );
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(200);
  });

  it("returns 403 when verify token does not match", () => {
    const url = new URL(
      "https://example.com/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge"
    );
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(403);
  });

  it("returns 400 when mode is not subscribe", () => {
    const url = new URL(
      "https://example.com/webhook?hub.mode=unsubscribe&hub.verify_token=my_token&hub.challenge=test_challenge"
    );
    const result = handleVerification(url, "my_token");
    expect(result.status).toBe(400);
  });
});

describe("parseIncomingMessages", () => {
  it("extracts text messages from webhook payload", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            contacts: [{ profile: { name: "John" }, wa_id: "2250700000000" }],
            messages: [{
              from: "2250700000000",
              id: "wamid.abc",
              timestamp: "1234567890",
              type: "text" as const,
              text: { body: "Bonjour" },
            }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      from: "2250700000000",
      messageId: "wamid.abc",
      text: "Bonjour",
      contactName: "John",
      phoneNumberId: "phone_id",
    });
  });

  it("returns empty array for status updates (no messages)", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            statuses: [{ id: "wamid.abc", status: "delivered" as const, timestamp: "123", recipient_id: "456" }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(0);
  });

  it("skips non-text messages and returns empty", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "1234", phone_number_id: "phone_id" },
            contacts: [{ profile: { name: "John" }, wa_id: "2250700000000" }],
            messages: [{
              from: "2250700000000",
              id: "wamid.abc",
              timestamp: "1234567890",
              type: "image" as const,
            }],
          },
          field: "messages",
        }],
      }],
    };

    const messages = parseIncomingMessages(payload);
    expect(messages).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/webhook.test.ts
```

Expected: FAIL — imports not found.

- [ ] **Step 3: Implement `webhook.ts`**

```typescript
import type { WebhookPayload } from "./types";

export interface ParsedMessage {
  from: string;
  messageId: string;
  text: string;
  contactName: string;
  phoneNumberId: string;
}

export function handleVerification(url: URL, verifyToken: string): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return new Response("Invalid mode", { status: 400 });
  }

  if (token !== verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge ?? "", { status: 200 });
}

export function parseIncomingMessages(payload: WebhookPayload): ParsedMessage[] {
  const parsed: ParsedMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { messages, contacts, metadata } = change.value;
      if (!messages) continue;

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const contact = contacts?.find((c) => c.wa_id === msg.from);
        parsed.push({
          from: msg.from,
          messageId: msg.id,
          text: msg.text.body,
          contactName: contact?.profile.name ?? "Unknown",
          phoneNumberId: metadata.phone_number_id,
        });
      }
    }
  }

  return parsed;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/webhook.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/webhook.ts __tests__/unit/workers/whatsapp/webhook.test.ts
git commit -m "feat(whatsapp): implement webhook verification and message parsing"
```

---

## Task 8: Implement session management

**Files:**
- Create: `workers/whatsapp/src/session.ts`
- Test: `__tests__/unit/workers/whatsapp/session.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { findOrCreateSession } from "../../../../workers/whatsapp/src/session";

function createMockD1() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
  };
}

describe("findOrCreateSession", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns existing session if found", async () => {
    const existingSession = {
      id: "sess_123",
      wa_phone: "2250700000000",
      user_id: "usr_1",
      is_verified: 1,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    };
    mockDb._statement.first.mockResolvedValueOnce(existingSession);

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session).toEqual(existingSession);
    expect(mockDb.prepare).toHaveBeenCalledTimes(1);
  });

  it("creates new session and auto-links if phone matches a user", async () => {
    // No existing session
    mockDb._statement.first.mockResolvedValueOnce(null);
    // User found by phone
    mockDb._statement.first.mockResolvedValueOnce({ id: "usr_42" });
    // Insert succeeds
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    // Return new session
    mockDb._statement.first.mockResolvedValueOnce({
      id: "new_sess",
      wa_phone: "2250700000000",
      user_id: "usr_42",
      is_verified: 1,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    });

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session.user_id).toBe("usr_42");
    expect(session.is_verified).toBe(1);
  });

  it("creates unlinked session if no user matches", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);
    mockDb._statement.first.mockResolvedValueOnce(null); // no user found
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    mockDb._statement.first.mockResolvedValueOnce({
      id: "new_sess",
      wa_phone: "2250700000000",
      user_id: null,
      is_verified: 0,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    });

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session.user_id).toBeNull();
    expect(session.is_verified).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/session.test.ts
```

Expected: FAIL — `findOrCreateSession` not found.

- [ ] **Step 3: Implement `session.ts`**

```typescript
import type { WhatsAppSession } from "./types";

export async function findOrCreateSession(
  db: D1Database,
  waPhone: string
): Promise<WhatsAppSession> {
  // Try to find existing session
  const existing = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE wa_phone = ?")
    .bind(waPhone)
    .first<WhatsAppSession>();

  if (existing) return existing;

  // Try to auto-link by phone number (check 'user' table from better-auth)
  const matchedUser = await db
    .prepare("SELECT id FROM user WHERE phone = ? OR phone = ?")
    .bind(waPhone, formatPhoneVariant(waPhone))
    .first<{ id: string }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO whatsapp_sessions (id, wa_phone, user_id, is_verified, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      waPhone,
      matchedUser?.id ?? null,
      matchedUser ? 1 : 0,
      now,
      now
    )
    .run();

  const session = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE id = ?")
    .bind(id)
    .first<WhatsAppSession>();

  return session!;
}

/**
 * WhatsApp sends phone as "2250700000000" (no +).
 * Users may store "+2250700000000" or "0700000000".
 * Generate a common variant for matching.
 */
function formatPhoneVariant(waPhone: string): string {
  return `+${waPhone}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/session.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/session.ts __tests__/unit/workers/whatsapp/session.test.ts
git commit -m "feat(whatsapp): implement session management with auto-link"
```

---

## Task 9: Implement KV conversation context

**Files:**
- Create: `workers/whatsapp/src/context.ts`
- Test: `__tests__/unit/workers/whatsapp/context.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadContext, saveContext } from "../../../../workers/whatsapp/src/context";
import type { ConversationContext } from "../../../../workers/whatsapp/src/types";

function createMockKV() {
  return {
    get: vi.fn(),
    put: vi.fn(),
  };
}

describe("loadContext", () => {
  let mockKv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKv = createMockKV();
  });

  it("returns stored context if it exists", async () => {
    const stored: ConversationContext = {
      messages: [{ role: "user", content: "Bonjour" }],
      last_activity: "2026-04-13T10:00:00Z",
    };
    mockKv.get.mockResolvedValueOnce(JSON.stringify(stored));

    const ctx = await loadContext(mockKv as unknown as KVNamespace, "2250700000000");

    expect(ctx).toEqual(stored);
    expect(mockKv.get).toHaveBeenCalledWith("wa:conv:2250700000000");
  });

  it("returns empty context if nothing stored", async () => {
    mockKv.get.mockResolvedValueOnce(null);

    const ctx = await loadContext(mockKv as unknown as KVNamespace, "2250700000000");

    expect(ctx).toEqual({ messages: [], last_activity: expect.any(String) });
  });
});

describe("saveContext", () => {
  let mockKv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKv = createMockKV();
  });

  it("saves context with 24h TTL", async () => {
    const ctx: ConversationContext = {
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Bienvenue!" },
      ],
      last_activity: "2026-04-13T10:00:00Z",
    };

    await saveContext(mockKv as unknown as KVNamespace, "2250700000000", ctx);

    expect(mockKv.put).toHaveBeenCalledWith(
      "wa:conv:2250700000000",
      JSON.stringify(ctx),
      { expirationTtl: 86400 }
    );
  });

  it("trims messages to last 20", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
    }));
    const ctx: ConversationContext = {
      messages,
      last_activity: "2026-04-13T10:00:00Z",
    };

    await saveContext(mockKv as unknown as KVNamespace, "2250700000000", ctx);

    const savedArg = JSON.parse(mockKv.put.mock.calls[0][1] as string) as ConversationContext;
    expect(savedArg.messages).toHaveLength(20);
    expect(savedArg.messages[0].content).toBe("Message 5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/context.test.ts
```

Expected: FAIL — imports not found.

- [ ] **Step 3: Implement `context.ts`**

```typescript
import type { ConversationContext } from "./types";

const KV_PREFIX = "wa:conv:";
const TTL_SECONDS = 86400; // 24 hours
const MAX_MESSAGES = 20;

export async function loadContext(
  kv: KVNamespace,
  waPhone: string
): Promise<ConversationContext> {
  const stored = await kv.get(`${KV_PREFIX}${waPhone}`);

  if (stored) {
    return JSON.parse(stored) as ConversationContext;
  }

  return {
    messages: [],
    last_activity: new Date().toISOString(),
  };
}

export async function saveContext(
  kv: KVNamespace,
  waPhone: string,
  context: ConversationContext
): Promise<void> {
  const trimmed: ConversationContext = {
    ...context,
    messages: context.messages.slice(-MAX_MESSAGES),
    last_activity: new Date().toISOString(),
  };

  await kv.put(`${KV_PREFIX}${waPhone}`, JSON.stringify(trimmed), {
    expirationTtl: TTL_SECONDS,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/context.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/context.ts __tests__/unit/workers/whatsapp/context.test.ts
git commit -m "feat(whatsapp): implement KV conversation context"
```

---

## Task 10: Implement catalogue tools

**Files:**
- Create: `workers/whatsapp/src/tools/catalogue.ts`
- Test: `__tests__/unit/workers/whatsapp/tools/catalogue.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchProducts, getProduct, getCategories } from "../../../../../workers/whatsapp/src/tools/catalogue";

function createMockD1() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
  };
}

describe("searchProducts", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("searches products by query and returns formatted results", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "p1", name: "iPhone 15", slug: "iphone-15", base_price: 650000, stock_quantity: 5, brand: "Apple", image_url: null },
        { id: "p2", name: "iPhone 14", slug: "iphone-14", base_price: 450000, stock_quantity: 0, brand: "Apple", image_url: null },
      ],
    });

    const result = await searchProducts(mockDb as unknown as D1Database, { query: "iphone" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      name: "iPhone 15",
      price: 650000,
      in_stock: true,
    });
    expect(result.data[1]).toMatchObject({
      name: "iPhone 14",
      price: 450000,
      in_stock: false,
    });
  });

  it("returns empty array when no products found", async () => {
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await searchProducts(mockDb as unknown as D1Database, { query: "xyz" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });
});

describe("getProduct", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns product details with variants", async () => {
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1", name: "iPhone 15", slug: "iphone-15", base_price: 650000,
      stock_quantity: 5, brand: "Apple", short_description: "Latest iPhone",
      category_name: "Smartphones",
    });
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", name: "128GB", price: 650000, stock_quantity: 3 },
        { id: "v2", name: "256GB", price: 750000, stock_quantity: 2 },
      ],
    });

    const result = await getProduct(mockDb as unknown as D1Database, { slug: "iphone-15" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: "iPhone 15",
      price: 650000,
      variants: [
        { id: "v1", name: "128GB", price: 650000, in_stock: true },
        { id: "v2", name: "256GB", price: 750000, in_stock: true },
      ],
    });
  });

  it("returns error when product not found", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await getProduct(mockDb as unknown as D1Database, { slug: "nope" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Product not found");
  });
});

describe("getCategories", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns top-level categories when no parent specified", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "c1", name: "Smartphones", slug: "smartphones", product_count: 25 },
        { id: "c2", name: "Laptops", slug: "laptops", product_count: 15 },
      ],
    });

    const result = await getCategories(mockDb as unknown as D1Database, {});

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/catalogue.test.ts
```

Expected: FAIL — imports not found.

- [ ] **Step 3: Implement `tools/catalogue.ts`**

```typescript
import type { ToolResult } from "../types";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  stock_quantity: number;
  brand: string | null;
  image_url: string | null;
}

interface ProductDetailRow extends ProductRow {
  short_description: string | null;
  category_name: string | null;
}

interface VariantRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

export async function searchProducts(
  db: D1Database,
  params: { query: string; category_slug?: string; limit?: number }
): Promise<ToolResult & { data: unknown[] }> {
  const limit = Math.min(params.limit ?? 5, 10);
  const searchTerm = `%${params.query}%`;

  let sql = `
    SELECT p.id, p.name, p.slug, p.base_price, p.stock_quantity, p.brand,
           (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as image_url
    FROM products p
    WHERE p.is_active = 1 AND p.is_draft = 0
      AND (p.name LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ?)
  `;
  const bindings: unknown[] = [searchTerm, searchTerm, searchTerm];

  if (params.category_slug) {
    sql += ` AND p.category_id = (SELECT id FROM categories WHERE slug = ?)`;
    bindings.push(params.category_slug);
  }

  sql += ` ORDER BY p.is_featured DESC, p.stock_quantity DESC LIMIT ?`;
  bindings.push(limit);

  const { results } = await db
    .prepare(sql)
    .bind(...bindings)
    .all<ProductRow>();

  const data = results.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.base_price,
    brand: p.brand,
    in_stock: p.stock_quantity > 0,
  }));

  return { success: true, data };
}

export async function getProduct(
  db: D1Database,
  params: { slug: string }
): Promise<ToolResult & { data?: unknown }> {
  const product = await db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.base_price, p.stock_quantity, p.brand, p.short_description,
              c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_active = 1`
    )
    .bind(params.slug)
    .first<ProductDetailRow>();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { results: variants } = await db
    .prepare(
      `SELECT id, name, price, stock_quantity
       FROM product_variants
       WHERE product_id = ? AND is_active = 1
       ORDER BY sort_order`
    )
    .bind(product.id)
    .all<VariantRow>();

  return {
    success: true,
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      brand: product.brand,
      description: product.short_description,
      category: product.category_name,
      in_stock: product.stock_quantity > 0,
      stock_quantity: product.stock_quantity,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        in_stock: v.stock_quantity > 0,
      })),
    },
  };
}

export async function getCategories(
  db: D1Database,
  params: { parent_slug?: string }
): Promise<ToolResult & { data: unknown[] }> {
  let sql: string;
  const bindings: unknown[] = [];

  if (params.parent_slug) {
    sql = `
      SELECT c.id, c.name, c.slug,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1 AND c.parent_id = (SELECT id FROM categories WHERE slug = ?)
      ORDER BY c.sort_order
    `;
    bindings.push(params.parent_slug);
  } else {
    sql = `
      SELECT c.id, c.name, c.slug,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1 AND c.parent_id IS NULL
      ORDER BY c.sort_order
    `;
  }

  const { results } = await db.prepare(sql).bind(...bindings).all<CategoryRow>();

  return {
    success: true,
    data: results.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      product_count: c.product_count,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/tools/catalogue.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/tools/catalogue.ts __tests__/unit/workers/whatsapp/tools/catalogue.test.ts
git commit -m "feat(whatsapp): implement catalogue tools (search, product, categories)"
```

---

## Task 11: Build tool registry

**Files:**
- Create: `workers/whatsapp/src/tools/registry.ts`

- [ ] **Step 1: Create tool definitions and dispatch**

```typescript
import type { ToolDefinition, ToolResult } from "../types";
import { searchProducts, getProduct, getCategories } from "./catalogue";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the NETEREKA product catalogue. Use when the customer asks about products, wants recommendations, or searches for items.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (product name, brand, type)",
          },
          category_slug: {
            type: "string",
            description: "Optional category slug to filter by",
          },
          limit: {
            type: "number",
            description: "Max results (default 5, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description:
        "Get detailed information about a specific product including variants and stock. Use when the customer asks for details about a particular product.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Product slug (URL identifier)",
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description:
        "List product categories. Use when the customer wants to browse by category or asks what types of products are available.",
      parameters: {
        type: "object",
        properties: {
          parent_slug: {
            type: "string",
            description: "Parent category slug to list subcategories. Omit for top-level categories.",
          },
        },
      },
    },
  },
];

export async function dispatchTool(
  db: D1Database,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(db, args as { query: string; category_slug?: string; limit?: number });
    case "get_product":
      return getProduct(db, args as { slug: string });
    case "get_categories":
      return getCategories(db, args as { parent_slug?: string });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/whatsapp/src/tools/registry.ts
git commit -m "feat(whatsapp): add tool registry with definitions and dispatch"
```

---

## Task 12: Implement LLM integration with Workers AI

**Files:**
- Create: `workers/whatsapp/src/llm.ts`
- Test: `__tests__/unit/workers/whatsapp/llm.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSystemPrompt, callLLM } from "../../../../workers/whatsapp/src/llm";
import type { ChatMessage } from "../../../../workers/whatsapp/src/types";

describe("buildSystemPrompt", () => {
  it("contains key instructions", () => {
    const prompt = buildSystemPrompt(false);
    expect(prompt).toContain("NETEREKA Electronic");
    expect(prompt).toContain("XOF");
    expect(prompt).toContain("FCFA");
    expect(prompt).toContain("français");
  });

  it("includes account linking hint when not verified", () => {
    const prompt = buildSystemPrompt(false);
    expect(prompt).toContain("compte");
  });

  it("includes order capability when verified", () => {
    const prompt = buildSystemPrompt(true);
    expect(prompt).toContain("commander");
  });
});

describe("callLLM", () => {
  it("returns text response when no tool call", async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValueOnce({
        response: "Bienvenue chez NETEREKA!",
      }),
    };

    const result = await callLLM(
      mockAI as unknown as Ai,
      [{ role: "user", content: "Bonjour" }],
      true
    );

    expect(result).toEqual({
      type: "text",
      content: "Bienvenue chez NETEREKA!",
    });
  });

  it("returns tool_call when LLM wants to call a function", async () => {
    const mockAI = {
      run: vi.fn().mockResolvedValueOnce({
        response: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "search_products",
              arguments: '{"query":"iphone"}',
            },
          },
        ],
      }),
    };

    const result = await callLLM(
      mockAI as unknown as Ai,
      [{ role: "user", content: "Montrez-moi les iPhones" }],
      true
    );

    expect(result).toEqual({
      type: "tool_call",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "search_products", arguments: '{"query":"iphone"}' },
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/unit/workers/whatsapp/llm.test.ts
```

Expected: FAIL — imports not found.

- [ ] **Step 3: Implement `llm.ts`**

```typescript
import type { ChatMessage, ToolCall } from "./types";
import { TOOL_DEFINITIONS } from "./tools/registry";

const MODEL = "@cf/google/gemma-3-27b-it";

export type LLMResponse =
  | { type: "text"; content: string }
  | { type: "tool_call"; toolCalls: ToolCall[] };

export function buildSystemPrompt(isVerified: boolean): string {
  const base = `Tu es l'assistant commercial de NETEREKA Electronic, une boutique en ligne d'électronique en Côte d'Ivoire.

RÈGLES:
- Réponds toujours en français, sauf si le client écrit en anglais
- Monnaie: XOF (FCFA). Affiche les prix avec le format "XXX XXX FCFA"
- Paiement: à la livraison uniquement (cash on delivery)
- Sois professionnel, amical et concis — messages courts adaptés à WhatsApp
- Utilise *gras* pour les noms de produits et les prix
- Maximum 1-2 emojis par message
- Ne réponds qu'aux sujets liés à NETEREKA et ses produits
- Si tu ne connais pas la réponse, propose de transférer à un conseiller

CAPACITÉS:
- Rechercher des produits dans le catalogue
- Afficher les détails d'un produit (prix, stock, variantes)
- Lister les catégories de produits`;

  if (isVerified) {
    return `${base}
- Passer des commandes et suivre leur statut (le client a un compte lié)
- Le client peut commander directement via cette conversation`;
  }

  return `${base}

COMPTE NON LIÉ:
Le client n'a pas encore lié son compte NETEREKA. Il peut parcourir le catalogue et poser des questions.
Pour commander, il doit d'abord lier son compte. Mentionne-le gentiment si le client essaie de commander.`;
}

export async function callLLM(
  ai: Ai,
  messages: ChatMessage[],
  isVerified: boolean
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(isVerified);

  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "tool",
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
    })),
  ];

  const response = (await ai.run(MODEL, {
    messages: aiMessages,
    tools: TOOL_DEFINITIONS,
  })) as { response?: string; tool_calls?: ToolCall[] };

  if (response.tool_calls && response.tool_calls.length > 0) {
    return { type: "tool_call", toolCalls: response.tool_calls };
  }

  return { type: "text", content: response.response ?? "Désolé, je n'ai pas pu traiter votre message." };
}
```

**Note:** The model ID `@cf/google/gemma-3-27b-it` is used as a placeholder. When Gemma 4 becomes available on Workers AI, update the `MODEL` constant to the correct model ID (e.g., `@cf/google/gemma-4-12b-it`). Check the Workers AI model catalog at deploy time.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/unit/workers/whatsapp/llm.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/whatsapp/src/llm.ts __tests__/unit/workers/whatsapp/llm.test.ts
git commit -m "feat(whatsapp): implement LLM integration with Workers AI"
```

---

## Task 13: Build message orchestrator

**Files:**
- Create: `workers/whatsapp/src/orchestrator.ts`

- [ ] **Step 1: Implement orchestrator**

This ties everything together: session → context → LLM → tools → response.

```typescript
import type { Env, ChatMessage } from "./types";
import type { ParsedMessage } from "./webhook";
import { findOrCreateSession } from "./session";
import { loadContext, saveContext } from "./context";
import { callLLM } from "./llm";
import { dispatchTool } from "./tools/registry";
import { WhatsAppAPI } from "./whatsapp-api";

const MAX_TOOL_ROUNDS = 3;

export async function handleIncomingMessage(
  env: Env,
  config: { phoneNumberId: string; accessToken: string },
  message: ParsedMessage
): Promise<void> {
  const api = new WhatsAppAPI(config.phoneNumberId, config.accessToken);

  // Mark as read immediately
  api.markAsRead(message.messageId);

  // 1. Find or create session
  const session = await findOrCreateSession(env.DB, message.from);

  // 2. Load conversation context from KV
  const context = await loadContext(env.KV, message.from);

  // 3. Add user message to context
  context.messages.push({ role: "user", content: message.text });

  // 4. Log inbound message to D1
  await logMessage(env.DB, session.id, message.messageId, "inbound", message.text, "text");

  // 5. Call LLM with tool loop
  const isVerified = session.is_verified === 1;
  let currentMessages = [...context.messages];
  let responseText: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const llmResult = await callLLM(env.AI, currentMessages, isVerified);

    if (llmResult.type === "text") {
      responseText = llmResult.content;
      break;
    }

    // Execute tool calls
    for (const toolCall of llmResult.toolCalls) {
      const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      const toolResult = await dispatchTool(env.DB, toolCall.function.name, args);

      currentMessages.push({
        role: "assistant",
        content: "",
        name: toolCall.function.name,
      });
      currentMessages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });
    }
  }

  if (!responseText) {
    responseText = "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.";
  }

  // 6. Send response via WhatsApp
  const sendResult = await api.sendText(message.from, responseText);

  // 7. Update context and save
  context.messages.push({ role: "assistant", content: responseText });
  await saveContext(env.KV, message.from, context);

  // 8. Log outbound message
  await logMessage(
    env.DB,
    session.id,
    sendResult.messageId ?? null,
    "outbound",
    responseText,
    "text"
  );
}

async function logMessage(
  db: D1Database,
  sessionId: string,
  waMessageId: string | null,
  direction: "inbound" | "outbound",
  content: string,
  messageType: string
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO whatsapp_messages (id, session_id, wa_message_id, direction, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, sessionId, waMessageId, direction, content, messageType)
    .run();
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/whatsapp/src/orchestrator.ts
git commit -m "feat(whatsapp): build message orchestrator"
```

---

## Task 14: Wire Worker entry point

**Files:**
- Modify: `workers/whatsapp/src/index.ts`

- [ ] **Step 1: Replace stub with full implementation**

```typescript
import type { Env, WebhookPayload } from "./types";
import { verifySignature } from "./crypto";
import { handleVerification, parseIncomingMessages } from "./webhook";
import { handleIncomingMessage } from "./orchestrator";

export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    // GET: Meta webhook verification
    if (request.method === "GET") {
      const config = await getConfig(env.DB);
      if (!config) return new Response("Not configured", { status: 503 });
      return handleVerification(url, config.verify_token);
    }

    // POST: Incoming messages
    if (request.method === "POST") {
      const config = await getConfig(env.DB);
      if (!config || !config.is_active) {
        return new Response("OK", { status: 200 });
      }

      // Verify signature
      const body = await request.text();
      const signature = request.headers.get("x-hub-signature-256") ?? "";
      const isValid = await verifySignature(body, signature, config.webhook_secret);
      if (!isValid) {
        return new Response("Invalid signature", { status: 401 });
      }

      // Parse and handle messages (respond 200 immediately, process async)
      const payload = JSON.parse(body) as WebhookPayload;
      const messages = parseIncomingMessages(payload);

      // Process each message (non-blocking — Meta requires <5s response)
      for (const msg of messages) {
        // Using waitUntil to process after responding
        const processingPromise = handleIncomingMessage(
          env,
          { phoneNumberId: config.phone_number_id, accessToken: config.access_token },
          msg
        ).catch((err) => {
          console.error("Error processing message:", err);
        });

        // If ExecutionContext is available, use waitUntil
        // For now, await (Workers support up to 30s CPU time)
        await processingPromise;
      }

      return new Response("OK", { status: 200 });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
} satisfies ExportedHandler<Env>;

interface WhatsAppConfig {
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  webhook_secret: string;
  admin_phones: string;
  is_active: number;
}

async function getConfig(db: D1Database): Promise<WhatsAppConfig | null> {
  return db
    .prepare("SELECT * FROM whatsapp_config WHERE id = 1")
    .first<WhatsAppConfig>();
}
```

- [ ] **Step 2: Verify Worker builds**

```bash
cd workers/whatsapp && npx wrangler deploy --dry-run
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add workers/whatsapp/src/index.ts
git commit -m "feat(whatsapp): wire Worker entry point with webhook + orchestrator"
```

---

## Task 15: Add npm scripts and deployment config

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add Worker scripts to root `package.json`**

Add to the `"scripts"` section:

```json
"whatsapp:dev": "npx wrangler dev --config workers/whatsapp/wrangler.jsonc",
"whatsapp:deploy": "npx wrangler deploy --config workers/whatsapp/wrangler.jsonc",
"whatsapp:tail": "npx wrangler tail --config workers/whatsapp/wrangler.jsonc"
```

- [ ] **Step 2: Test local dev**

```bash
npm run whatsapp:dev
```

Expected: Worker starts locally. Visiting `http://localhost:8787/webhook` (GET without params) returns 503 "Not configured" (no config in D1 yet).

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(whatsapp): add Worker dev/deploy npm scripts"
```

---

## Phase 1 Complete

At this point you have a working WhatsApp bot that can:
- Receive and verify Meta webhooks
- Create sessions and auto-link by phone number
- Maintain conversation context in KV (24h window)
- Use Workers AI (Gemma) to understand messages
- Search the product catalogue, get product details, list categories
- Respond via WhatsApp Cloud API
- Log all messages to D1

**Next phases (separate plans):**
- **Phase 2:** Cart tools, order creation, account linking (OTP), delivery zones
- **Phase 3:** Admin dashboard — config page, conversations viewer, analytics
- **Phase 4:** Storefront WhatsApp buttons, proactive notifications, service binding
