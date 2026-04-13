# WhatsApp Admin Dashboard — Implementation Plan (Phase 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WhatsApp management pages to the admin dashboard: configuration (API keys), conversations viewer with manual reply, and analytics.

**Architecture:** Standard Next.js admin pages following existing patterns — server components for data fetching, client wrappers for interactivity, server actions for mutations. Data comes from the shared D1 database (whatsapp_config, whatsapp_sessions, whatsapp_messages, orders tables).

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Drizzle ORM, shadcn/ui, Tailwind CSS, Hugeicons

---

## File Structure

### New files

```
app/(admin)/whatsapp/
├── settings/
│   └── page.tsx                           # Config page (API keys, admin phones)
├── conversations/
│   ├── page.tsx                           # Conversations list
│   └── [id]/
│       └── page.tsx                       # Conversation detail (chat view)
└── analytics/
    └── page.tsx                           # Analytics dashboard

actions/admin/whatsapp.ts                  # Server actions (save config, send message, get stats)

components/admin/whatsapp/
├── whatsapp-config-form.tsx               # Config form (client component)
├── conversations-list.tsx                 # Conversations list (client component)
├── conversation-detail.tsx                # Chat view + manual reply (client component)
└── whatsapp-analytics.tsx                 # Analytics charts/metrics (client component)
```

### Modified files

```
components/admin/sidebar.tsx               # Add WhatsApp nav section
```

---

## Task 1: Add WhatsApp section to admin sidebar

**Files:**
- Modify: `components/admin/sidebar.tsx`

- [ ] **Step 1: Read sidebar.tsx to understand current structure**

- [ ] **Step 2: Add WhatsApp nav items**

Import a WhatsApp-related icon from Hugeicons (e.g., `MessageMultiple02Icon` or `SmartPhone01Icon`) and add 3 nav items after the "Clients" section:

```typescript
{ href: "/whatsapp/conversations", label: "Conversations WA", icon: MessageMultiple02Icon, minRole: "agent" },
{ href: "/whatsapp/analytics", label: "Analytics WA", icon: ChartLineData02Icon, minRole: "admin" },
{ href: "/whatsapp/settings", label: "Config WhatsApp", icon: Settings02Icon, minRole: "admin" },
```

Use appropriate icons from `@hugeicons/core-free-icons`. Check what icons are already imported and follow the same naming pattern.

- [ ] **Step 3: Verify the sidebar renders correctly**

Run `npm run dev` and check the admin sidebar shows the new items.

- [ ] **Step 4: Commit**

```bash
git add components/admin/sidebar.tsx
git commit -m "feat(admin): add WhatsApp section to admin sidebar"
```

---

## Task 2: Implement WhatsApp server actions

**Files:**
- Create: `actions/admin/whatsapp.ts`

- [ ] **Step 1: Implement server actions**

```typescript
"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { getDB } from "@/lib/cloudflare/context";
import { revalidatePath } from "next/cache";

// --- Types ---

export interface WhatsAppConfig {
  id: number;
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  webhook_secret: string;
  business_account_id: string | null;
  admin_phones: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  wa_phone: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  is_verified: number;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
}

export interface MessageItem {
  id: string;
  direction: string;
  content: string;
  message_type: string;
  created_at: string;
}

export interface WhatsAppStats {
  total_conversations: number;
  active_conversations: number;
  escalated_conversations: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
  whatsapp_orders: number;
  whatsapp_revenue: number;
  web_orders: number;
  web_revenue: number;
}

// --- Config Actions ---

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  await requireAdmin();
  const db = getDB();
  const result = await db.prepare("SELECT * FROM whatsapp_config WHERE id = 1").first<WhatsAppConfig>();
  return result;
}

export async function saveWhatsAppConfig(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const db = getDB();

  const phoneNumberId = formData.get("phone_number_id") as string;
  const accessToken = formData.get("access_token") as string;
  const verifyToken = formData.get("verify_token") as string;
  const webhookSecret = formData.get("webhook_secret") as string;
  const businessAccountId = (formData.get("business_account_id") as string) || null;
  const adminPhones = formData.get("admin_phones") as string;
  const isActive = formData.get("is_active") === "on" ? 1 : 0;

  if (!phoneNumberId || !accessToken || !verifyToken || !webhookSecret) {
    return { success: false, error: "Tous les champs obligatoires doivent être remplis." };
  }

  // Validate admin_phones is valid JSON array
  try {
    const parsed = JSON.parse(adminPhones || "[]");
    if (!Array.isArray(parsed)) throw new Error();
  } catch {
    return { success: false, error: "Les numéros admin doivent être un tableau JSON valide." };
  }

  const existing = await db.prepare("SELECT id FROM whatsapp_config WHERE id = 1").first();

  if (existing) {
    await db.prepare(
      `UPDATE whatsapp_config SET phone_number_id = ?, access_token = ?, verify_token = ?, webhook_secret = ?, business_account_id = ?, admin_phones = ?, is_active = ?, updated_at = datetime('now') WHERE id = 1`
    ).bind(phoneNumberId, accessToken, verifyToken, webhookSecret, businessAccountId, adminPhones || "[]", isActive).run();
  } else {
    await db.prepare(
      `INSERT INTO whatsapp_config (id, phone_number_id, access_token, verify_token, webhook_secret, business_account_id, admin_phones, is_active, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(phoneNumberId, accessToken, verifyToken, webhookSecret, businessAccountId, adminPhones || "[]", isActive).run();
  }

  revalidatePath("/whatsapp/settings");
  return { success: true };
}

// --- Conversation Actions ---

export async function getConversations(params: {
  search?: string;
  status?: string;
  page?: number;
}): Promise<{ conversations: ConversationListItem[]; total: number }> {
  await requireAdmin();
  const db = getDB();
  const page = params.page ?? 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = "1=1";
  const bindings: unknown[] = [];

  if (params.status) {
    where += " AND ws.status = ?";
    bindings.push(params.status);
  }

  if (params.search) {
    where += " AND (ws.wa_phone LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
    const term = `%${params.search}%`;
    bindings.push(term, term, term);
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM whatsapp_sessions ws LEFT JOIN user u ON ws.user_id = u.id WHERE ${where}`)
    .bind(...bindings)
    .first<{ count: number }>();

  const { results } = await db
    .prepare(
      `SELECT ws.id, ws.wa_phone, ws.user_id, ws.is_verified, ws.status, ws.created_at,
              u.name as user_name, u.email as user_email,
              (SELECT content FROM whatsapp_messages wm WHERE wm.session_id = ws.id ORDER BY wm.created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM whatsapp_messages wm WHERE wm.session_id = ws.id ORDER BY wm.created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM whatsapp_messages wm WHERE wm.session_id = ws.id) as message_count
       FROM whatsapp_sessions ws
       LEFT JOIN user u ON ws.user_id = u.id
       WHERE ${where}
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<ConversationListItem>();

  return { conversations: results, total: countResult?.count ?? 0 };
}

export async function getConversationMessages(sessionId: string): Promise<{
  session: ConversationListItem;
  messages: MessageItem[];
} | null> {
  await requireAdmin();
  const db = getDB();

  const session = await db
    .prepare(
      `SELECT ws.id, ws.wa_phone, ws.user_id, ws.is_verified, ws.status, ws.created_at,
              u.name as user_name, u.email as user_email,
              0 as message_count
       FROM whatsapp_sessions ws
       LEFT JOIN user u ON ws.user_id = u.id
       WHERE ws.id = ?`
    )
    .bind(sessionId)
    .first<ConversationListItem>();

  if (!session) return null;

  const { results: messages } = await db
    .prepare(
      `SELECT id, direction, content, message_type, created_at
       FROM whatsapp_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`
    )
    .bind(sessionId)
    .all<MessageItem>();

  return { session, messages };
}

export async function sendAdminMessage(sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const db = getDB();

  const session = await db.prepare("SELECT wa_phone FROM whatsapp_sessions WHERE id = ?").bind(sessionId).first<{ wa_phone: string }>();
  if (!session) return { success: false, error: "Session introuvable" };

  const config = await db.prepare("SELECT phone_number_id, access_token FROM whatsapp_config WHERE id = 1").first<{ phone_number_id: string; access_token: string }>();
  if (!config) return { success: false, error: "WhatsApp non configuré" };

  // Send via WhatsApp API
  const response = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: session.wa_phone,
      type: "text",
      text: { body: message },
    }),
  });

  const data = (await response.json()) as { messages?: { id: string }[]; error?: { message: string } };

  if (!response.ok) {
    return { success: false, error: data.error?.message ?? "Erreur API WhatsApp" };
  }

  // Log the message
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO whatsapp_messages (id, session_id, wa_message_id, direction, content, message_type, created_at) VALUES (?, ?, ?, 'outbound', ?, 'text', datetime('now'))")
    .bind(id, sessionId, data.messages?.[0]?.id ?? null, message)
    .run();

  revalidatePath(`/whatsapp/conversations/${sessionId}`);
  return { success: true };
}

export async function updateSessionStatus(sessionId: string, status: "active" | "closed"): Promise<{ success: boolean }> {
  await requireAdmin();
  const db = getDB();
  await db.prepare("UPDATE whatsapp_sessions SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, sessionId).run();
  revalidatePath(`/whatsapp/conversations/${sessionId}`);
  revalidatePath("/whatsapp/conversations");
  return { success: true };
}

// --- Analytics ---

export async function getWhatsAppStats(period: "7d" | "30d" | "90d"): Promise<WhatsAppStats> {
  await requireAdmin();
  const db = getDB();

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [conversations, messages, orders] = await Promise.all([
    db.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated
       FROM whatsapp_sessions WHERE created_at >= ?`
    ).bind(since).first<{ total: number; active: number; escalated: number }>(),

    db.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
       FROM whatsapp_messages WHERE created_at >= ?`
    ).bind(since).first<{ total: number; inbound: number; outbound: number }>(),

    db.prepare(
      `SELECT
        SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as wa_count,
        SUM(CASE WHEN channel = 'whatsapp' THEN total ELSE 0 END) as wa_revenue,
        SUM(CASE WHEN channel = 'web' THEN 1 ELSE 0 END) as web_count,
        SUM(CASE WHEN channel = 'web' THEN total ELSE 0 END) as web_revenue
       FROM orders WHERE created_at >= ?`
    ).bind(since).first<{ wa_count: number; wa_revenue: number; web_count: number; web_revenue: number }>(),
  ]);

  return {
    total_conversations: conversations?.total ?? 0,
    active_conversations: conversations?.active ?? 0,
    escalated_conversations: conversations?.escalated ?? 0,
    total_messages: messages?.total ?? 0,
    inbound_messages: messages?.inbound ?? 0,
    outbound_messages: messages?.outbound ?? 0,
    whatsapp_orders: orders?.wa_count ?? 0,
    whatsapp_revenue: orders?.wa_revenue ?? 0,
    web_orders: orders?.web_count ?? 0,
    web_revenue: orders?.web_revenue ?? 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/admin/whatsapp.ts
git commit -m "feat(admin): add WhatsApp server actions (config, conversations, analytics)"
```

---

## Task 3: Implement WhatsApp settings page

**Files:**
- Create: `app/(admin)/whatsapp/settings/page.tsx`
- Create: `components/admin/whatsapp/whatsapp-config-form.tsx`

- [ ] **Step 1: Create the settings page (server component)**

```typescript
import { getWhatsAppConfig } from "@/actions/admin/whatsapp";
import { WhatsAppConfigForm } from "@/components/admin/whatsapp/whatsapp-config-form";

export default async function WhatsAppSettingsPage() {
  const config = await getWhatsAppConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration WhatsApp</h1>
        <p className="text-muted-foreground">Configurez la connexion à l'API WhatsApp Cloud de Meta.</p>
      </div>
      <WhatsAppConfigForm config={config} />
    </div>
  );
}
```

- [ ] **Step 2: Create the config form (client component)**

A form with fields for: phone_number_id, access_token (password input), verify_token, webhook_secret (password input), business_account_id, admin_phones (textarea for JSON array), is_active (switch). Submit calls `saveWhatsAppConfig` server action. Use `useTransition` + toast for feedback.

Follow the existing form patterns from `app/(admin)/stores/store-form-dialog.tsx` but as a standalone page form (not in a dialog).

- [ ] **Step 3: Commit**

```bash
git add "app/(admin)/whatsapp/" components/admin/whatsapp/
git commit -m "feat(admin): add WhatsApp settings page"
```

---

## Task 4: Implement conversations list page

**Files:**
- Create: `app/(admin)/whatsapp/conversations/page.tsx`
- Create: `components/admin/whatsapp/conversations-list.tsx`

- [ ] **Step 1: Create the conversations page (server component)**

Follows the orders page pattern: reads searchParams (search, status, page), calls `getConversations()`, passes data to client wrapper.

- [ ] **Step 2: Create the conversations list (client component)**

Table with columns: Client (name or phone), Last message (truncated + timestamp), Status (badge: Active/Escalade/Fermée), Account linked (Oui/Non), Messages count. Each row links to `/whatsapp/conversations/[id]`. Filter by status (dropdown), search by phone/name.

- [ ] **Step 3: Commit**

```bash
git add "app/(admin)/whatsapp/conversations/" components/admin/whatsapp/conversations-list.tsx
git commit -m "feat(admin): add WhatsApp conversations list page"
```

---

## Task 5: Implement conversation detail page

**Files:**
- Create: `app/(admin)/whatsapp/conversations/[id]/page.tsx`
- Create: `components/admin/whatsapp/conversation-detail.tsx`

- [ ] **Step 1: Create the detail page (server component)**

Calls `getConversationMessages(id)`, shows session info + message history.

- [ ] **Step 2: Create the conversation detail (client component)**

Chat-style view with:
- Messages rendered as bubbles (inbound = left/gray, outbound = right/primary)
- Session info sidebar (phone, name, email, status, orders)
- Text input + send button for manual admin replies (calls `sendAdminMessage`)
- "Fermer la conversation" / "Reprendre en mode bot" buttons (calls `updateSessionStatus`)

- [ ] **Step 3: Commit**

```bash
git add "app/(admin)/whatsapp/conversations/" components/admin/whatsapp/conversation-detail.tsx
git commit -m "feat(admin): add WhatsApp conversation detail page with chat view"
```

---

## Task 6: Implement analytics page

**Files:**
- Create: `app/(admin)/whatsapp/analytics/page.tsx`
- Create: `components/admin/whatsapp/whatsapp-analytics.tsx`

- [ ] **Step 1: Create the analytics page (server component)**

Reads period from searchParams (default "30d"), calls `getWhatsAppStats(period)`.

- [ ] **Step 2: Create the analytics dashboard (client component)**

Grid of metric cards:
- Row 1: Conversations (total, active, escalated)
- Row 2: Messages (total, inbound, outbound)
- Row 3: Orders comparison (WhatsApp count + revenue vs Web count + revenue)

Period selector (7j/30j/90j) as tabs or button group, using nuqs or searchParams.

Follow existing admin card patterns (e.g., dashboard page if it uses stat cards).

- [ ] **Step 3: Commit**

```bash
git add "app/(admin)/whatsapp/analytics/" components/admin/whatsapp/whatsapp-analytics.tsx
git commit -m "feat(admin): add WhatsApp analytics page"
```

---

## Phase 3 Complete

At this point the admin dashboard has:
- **Settings**: Configure Meta API keys, admin phones, toggle active
- **Conversations**: Browse all WhatsApp conversations, filter by status, view chat history, send manual replies, close/reopen conversations
- **Analytics**: Conversations, messages, orders metrics with period filter
- **Sidebar**: WhatsApp section with 3 nav items

**Next phase:**
- **Phase 4:** Storefront WhatsApp buttons + proactive notifications + service binding
