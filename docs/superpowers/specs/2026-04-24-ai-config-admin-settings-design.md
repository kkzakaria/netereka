# AI Config — Admin Settings

**Date :** 2026-04-24
**Branche :** `feat/ai-config-admin-settings`
**Auteur :** brainstorming session (user + Claude Code)

## Contexte et objectif

Aujourd'hui les trois paramètres de la feature « AI Product Creation » vivent en variables d'environnement Cloudflare, ce qui oblige un dev à toucher au code/infra pour chaque modification :

| Variable | Type | Usage |
|---|---|---|
| `ANTHROPIC_API_KEY` | secret | clé API Anthropic, lue dans `lib/ai/client.ts` |
| `AI_MODEL` | string | override du modèle, lu dans `app/api/admin/products-ai/generate/route.ts` |
| `AI_PRODUCT_CREATION_ENABLED` | flag (`"0"` = désactivé) | feature flag, lu dans `lib/ai/client.ts` |

Ces trois valeurs sont lues en mode lazy (à chaque appel) — il n'y a pas de boot/init côté framework qui les capture une fois pour toutes. Elles sont donc déplaçables vers la base de données sans surcoût notable et sans risque de cache stale au niveau du Worker.

**Objectif :** offrir une page admin permettant à un utilisateur non-technique de visualiser et de mettre à jour ces trois paramètres sans intervention dev/infra.

**Hors-scope (explicite) :** les autres clés en env vars (`BETTER_AUTH_SECRET`, OAuth Google/Facebook/Apple, Turnstile, Resend) ne sont **pas** concernées par ce design. Une éventuelle migration de ces secrets fera l'objet d'un design séparé.

## Précédent existant

Le pattern WhatsApp config (`whatsapp_config` table + `app/(admin)/whatsapp/settings/page.tsx` + `components/admin/whatsapp/whatsapp-config-form.tsx` + masque `••••••••<last 4>`) est exactement le modèle qu'on étend ici. Cohérence > nouveauté.

## Architecture

```
lib/db/schema.ts                              → ajout table aiConfig
drizzle/00XX_create_ai_config.sql             → migration générée par drizzle-kit
lib/db/types.ts                               → AiConfig interface
lib/ai/config.ts                              → NEW - resolver DB-first + fallback env
lib/ai/client.ts                              → modifié - consomme getAiSettings()
app/api/admin/products-ai/generate/route.ts   → modifié - consomme getAiSettings()
actions/admin/ai-config.ts                    → NEW - getAiConfig() + saveAiConfig()
lib/validations/ai-config.ts                  → NEW - schéma Zod
app/(admin)/ai-settings/page.tsx              → NEW - page admin
components/admin/ai/ai-config-form.tsx        → NEW - formulaire
components/admin/sidebar.tsx                  → modifié - entrée "Config AI"
```

## Schéma DB

```ts
// lib/db/schema.ts
export const aiConfig = sqliteTable("ai_config", {
  id: integer("id").primaryKey(),                       // toujours 1 (singleton row)
  anthropic_api_key: text("anthropic_api_key"),         // null = non configuré, fallback env
  model: text("model"),                                  // null = défaut hardcodé dans product-research.ts
  enabled: integer("enabled").notNull().default(1),      // 0 ou 1
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
```

**Notes :**
- 1 seule ligne (`id=1`), pattern singleton identique à `whatsapp_config`.
- `anthropic_api_key` stocké en clair (cohérent avec WhatsApp `access_token`). D1 n'a pas de chiffrement column-level natif, et introduire un wrapper crypto serait une asymétrie avec le reste du repo.
- Migration générée via `npm run db:generate` puis review du SQL avant commit. Backward-compatible (nouvelle table seulement) → ne déclenche pas le check `scripts/check-migration-safety.mjs`.

## Resolver — fallback gracieux env → DB

Nouveau module `lib/ai/config.ts` qui centralise la résolution :

```ts
// lib/ai/config.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiConfig } from "@/lib/db/schema";

export interface AiSettings {
  apiKey: string | null;
  model: string | undefined;
  enabled: boolean;
}

export async function getAiSettings(): Promise<AiSettings> {
  const db = await getDrizzle();
  const row = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  const { env } = await getCloudflareContext({ async: true });

  return {
    apiKey: row?.anthropic_api_key || env.ANTHROPIC_API_KEY || null,
    model:  row?.model            || env.AI_MODEL          || undefined,
    enabled: row
      ? row.enabled === 1
      : env.AI_PRODUCT_CREATION_ENABLED !== "0",  // preserve current default-on semantics
  };
}
```

**Règles de précédence par champ :**
- `apiKey` : DB row si non-null/non-vide, sinon env var, sinon `null` (= feature inutilisable, l'appelant doit throw).
- `model` : DB row si non-null/non-vide, sinon env var, sinon `undefined` (= laisse `researchProduct` utiliser son défaut hardcodé).
- `enabled` : si une row DB existe, sa colonne `enabled` fait foi (1=on, 0=off). Sinon, sémantique actuelle préservée : `enabled` sauf si `AI_PRODUCT_CREATION_ENABLED === "0"`.

**Pas de cache cross-request.** Une lookup DB par appel API AI ; ces appels sont rares (génération de produit en admin, rate-limited). Pas besoin de KV ici.

## Modifications des call sites

### `lib/ai/client.ts`

Avant :
```ts
export async function getAnthropicClient(): Promise<Anthropic> {
  if (cached) return cached;
  const { env } = await getCloudflareContext({ async: true });
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 3 });
  return cached;
}

export function isAiFeatureEnabled(env: CloudflareEnv): boolean {
  return env.AI_PRODUCT_CREATION_ENABLED !== "0";
}
```

Après :
```ts
import { getAiSettings } from "@/lib/ai/config";

// Le cache module-level est SUPPRIMÉ : si l'admin change la clé, on doit la prendre
// au prochain appel. Coût d'instancier un Anthropic client : négligeable.
export async function getAnthropicClient(): Promise<Anthropic> {
  const { apiKey } = await getAiSettings();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey, maxRetries: 3 });
}

export async function isAiFeatureEnabled(): Promise<boolean> {
  const { enabled } = await getAiSettings();
  return enabled;
}
```

**Breaking change :** `isAiFeatureEnabled` passe de sync `(env)` → async `()`. Trois appelants à mettre à jour :
- `app/api/admin/products-ai/generate/route.ts` (route POST)
- `app/(admin)/products/page.tsx` (cache le bouton AI dans la liste produits si désactivé)
- `app/(admin)/products/ai-new/page.tsx` (renvoie `notFound()` si désactivé)

Les deux pages admin sont des Server Components async, l'`await` y est trivial à ajouter.

### `app/api/admin/products-ai/generate/route.ts`

Avant :
```ts
const { env } = await getCloudflareContext({ async: true });
if (!isAiFeatureEnabled(env)) return new NextResponse("Not found", { status: 404 });
// ...
const model = env.AI_MODEL || undefined;
```

Après :
```ts
import { getAiSettings } from "@/lib/ai/config";

const settings = await getAiSettings();
if (!settings.enabled) return new NextResponse("Not found", { status: 404 });
// ...
const model = settings.model;
```

Les deux pages admin (`products/page.tsx` et `products/ai-new/page.tsx`) sont mises à jour de la même façon : retirer le `getCloudflareContext` local (s'il n'est pas utilisé ailleurs dans le fichier) et `await isAiFeatureEnabled()`.

## Server Actions

```ts
// actions/admin/ai-config.ts
"use server";

import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiConfig } from "@/lib/db/schema";
import { aiConfigSchema } from "@/lib/validations/ai-config";
import type { ActionResult } from "@/lib/types/actions";

export interface AiConfigView {
  apiKeyMask: string | null;     // "••••••••abcd" si configuré, null sinon
  apiKeyFromEnv: boolean;        // true si la valeur effective vient encore d'env (= legacy)
  model: string | null;
  enabled: boolean;
}

export async function getAiConfig(): Promise<AiConfigView> {
  await requireAdmin();
  const db = await getDrizzle();
  const row = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  const { env } = await getCloudflareContext({ async: true });

  const dbKey = row?.anthropic_api_key ?? null;
  return {
    apiKeyMask: dbKey ? maskKey(dbKey) : (env.ANTHROPIC_API_KEY ? maskKey(env.ANTHROPIC_API_KEY) : null),
    apiKeyFromEnv: !dbKey && !!env.ANTHROPIC_API_KEY,
    model: row?.model ?? null,
    enabled: row ? row.enabled === 1 : env.AI_PRODUCT_CREATION_ENABLED !== "0",
  };
}

export async function saveAiConfig(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = aiConfigSchema.safeParse({
    anthropic_api_key: formData.get("anthropic_api_key"),
    model: formData.get("model"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const db = await getDrizzle();
  const existing = await db.select().from(aiConfig).where(eq(aiConfig.id, 1)).get();
  const expectedMask = existing?.anthropic_api_key ? maskKey(existing.anthropic_api_key) : null;

  // gotcha CLAUDE.md : détection "non modifié" par égalité EXACTE au masque
  const incomingKey = parsed.data.anthropic_api_key === expectedMask
    ? existing!.anthropic_api_key
    : (parsed.data.anthropic_api_key || null);

  await db.insert(aiConfig).values({
    id: 1,
    anthropic_api_key: incomingKey,
    model: parsed.data.model || null,
    enabled: parsed.data.enabled ? 1 : 0,
    updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  }).onConflictDoUpdate({
    target: aiConfig.id,
    set: {
      anthropic_api_key: incomingKey,
      model: parsed.data.model || null,
      enabled: parsed.data.enabled ? 1 : 0,
      updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    },
  });

  revalidatePath("/ai-settings");
  return { success: true };
}

function maskKey(key: string): string {
  return "••••••••" + key.slice(-4);
}
```

**RBAC :** `requireAdmin()` accepte `admin` + `super_admin` (existant). Cohérent avec WhatsApp settings et avec le fait que tout admin peut déjà *consommer* la clé via la feature de génération.

## Validation Zod

```ts
// lib/validations/ai-config.ts
import { z } from "zod";

export const aiConfigSchema = z.object({
  anthropic_api_key: z.string().trim().max(500).optional().nullable(),
  model: z.string().trim().max(100).optional().nullable(),
  enabled: z.boolean(),
});
```

Pas de regex sur `anthropic_api_key` — Anthropic peut changer son format sans préavis, et le masque `••••••••<last 4>` doit pouvoir passer la validation (il sera ensuite résolu en valeur existante côté action).

## UI

### Page

```tsx
// app/(admin)/ai-settings/page.tsx
import { getAiConfig } from "@/actions/admin/ai-config";
import { AiConfigForm } from "@/components/admin/ai/ai-config-form";

export default async function AiSettingsPage() {
  const config = await getAiConfig();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration AI</h1>
        <p className="text-muted-foreground">
          Paramètres de la création assistée par IA des fiches produits.
        </p>
      </div>
      <AiConfigForm config={config} />
    </div>
  );
}
```

### Formulaire (composants client)

Reprend strictement le pattern `WhatsAppConfigForm` :

- **Toggle Switch** « Activer la création AI de produits » (`name="enabled"`)
- **Input Anthropic API Key** (`type=password` avec œil pour révéler), `defaultValue` = `config.apiKeyMask ?? ""`, placeholder = `sk-ant-...`
- **Input Modèle** (texte libre), `defaultValue` = `config.model ?? ""`, placeholder = `claude-opus-4-7` + helper text expliquant que vide = défaut
- **Bandeau d'info** si `config.apiKeyFromEnv === true` : « Cette clé est actuellement chargée depuis une variable d'environnement (legacy). Saisissez-la ici pour la gérer depuis l'admin. »
- Pattern `useTransition` + `toast.success/error` identique à WhatsAppConfigForm

### Sidebar

`components/admin/sidebar.tsx`, ajouter une entrée à côté de "Config WhatsApp" :

```ts
{ href: "/ai-settings", label: "Config AI", icon: <icône hugeicons cohérente>, minRole: "admin" as const },
```

## Tests (vitest)

### `lib/ai/config.test.ts`

- DB row présente avec valeurs → renvoyée
- DB row vide / champ null + env var présent → fallback env
- DB row absente entière + pas d'env var → `apiKey: null, model: undefined, enabled: true` (default-on)
- `enabled: 0` en DB → `enabled: false` même si env var dit le contraire
- `AI_PRODUCT_CREATION_ENABLED="0"` + pas de DB row → `enabled: false`

### `actions/admin/ai-config.test.ts`

- `getAiConfig` → 403/redirect si pas admin
- `getAiConfig` → renvoie masque correct (last 4 chars), `apiKeyFromEnv` correct
- `saveAiConfig` → schéma invalide → `fieldErrors`
- `saveAiConfig` → masque envoyé tel quel → la valeur DB existante n'est PAS écrasée
- `saveAiConfig` → nouvelle clé envoyée → upsert avec la nouvelle valeur
- `saveAiConfig` → champs vides → null en DB
- `saveAiConfig` → toggle `enabled` propagé en colonne `enabled`

## Migration & déploiement

1. Édit `lib/db/schema.ts` → `npm run db:generate` → review SQL généré
2. `npm run db:migrate` en local → vérification structure
3. Pré-commit hook (`tsc --noEmit` + `eslint` + `vitest run`) doit passer
4. Commit + PR
5. Au merge sur `main` :
   - `deploy.yml` déploie le code en canary 10%
   - Migration backward-compat (nouvelle table) → applicable sans risque
   - Table créée vide → fallback env vars actif → comportement identique à aujourd'hui
6. Promotion canary → 100% manuelle (workflow existant)
7. **Plus tard, hors PR :** quand l'admin a renseigné la clé via l'UI, on peut retirer les env vars `ANTHROPIC_API_KEY` / `AI_MODEL` / `AI_PRODUCT_CREATION_ENABLED` de Cloudflare. Les entrées dans `env.d.ts` restent (typage du fallback) — ne pas les supprimer dans ce PR.

## Décisions explicites (hors-scope)

- ❌ **Pas d'audit log** — cohérent avec WhatsApp settings, et l'audit log actuel (`lib/constants/audit.ts`) est scopé user-only (4 actions). L'élargir nécessiterait un design propre.
- ❌ **Pas de chiffrement column-level** — D1 n'a pas de natif, et WhatsApp `access_token` est aussi en clair. Asymétrie évitée.
- ❌ **Pas de RBAC `super_admin`-only** — tout admin peut déjà consommer la clé, asymétrie évitée. Cohérent avec WhatsApp.
- ❌ **Pas de retrait des entrées d'`env.d.ts`** — gardées comme typage du fallback.
- ❌ **Pas de touch aux autres secrets** (Better-Auth, OAuth, Resend, Turnstile) — périmètre restreint au AI uniquement par décision utilisateur.
- ❌ **Pas de cache KV** — appels rares (rate-limited admin), 1 query par appel acceptable.
- ❌ **Pas de cache module-level** dans `getAnthropicClient` — supprimé pour que les changements de clé soient pris immédiatement au prochain appel.
