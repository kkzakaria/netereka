# Lot B — MCP généralisé, révisions et images : plan d'implémentation

**Spec :** [`2026-09-20-mcp-generalise-images-design.md`](../specs/2026-09-20-mcp-generalise-images-design.md)
**Base :** `main` à la version 2.0.0

## Comment lire ce plan

Les tâches de la **phase 1** portent leur code complet : tout le reste en dépend, et une divergence sur le modèle de révision se paierait dans les quatre phases suivantes. Les phases 2 à 5 portent des signatures, des critères d'acceptation et le code des seuls passages subtils.

**Quand le code n'est pas donné, l'implémenteur suit le fichier voisin plutôt que d'inventer** : `lib/db/product-drafts.ts` pour l'accès aux données, `lib/mcp/tools/products.ts` pour un outil, `components/admin/banner-form.tsx` pour un formulaire. Si aucun voisin ne convient, c'est un signal — il s'arrête et demande.

## Contraintes globales

- **Le hook de pre-commit bloque tout** : `tsc --noEmit`, `eslint`, `vitest run`, `scripts/check-migration-safety.mjs`. Jamais `--no-verify`.
- **Commits conventionnels**, scopes : `storefront | admin | whatsapp | auth | db | seo | claude | ci | deps | release`. Corps sous 100 caractères par ligne.
- **Jamais `git add -A`** — la racine porte des répertoires d'outils IA non suivis.
- **Message de commit dans un fichier**, `git commit -F`.
- **Tout commentaire et tout texte visible en français.**
- **Vitest tourne en `node`, sans jsdom** : aucun composant React n'est rendu dans un test. La logique de décision va dans des fonctions pures exportées.
- **Drizzle obligatoire** pour tout nouvel accès aux données (`getDrizzle()`). Le SQL brut est legacy.
- **Migrations expand/contract** : `check-migration-safety.mjs` bloque `DROP COLUMN`, `DROP TABLE`, `RENAME COLUMN`. Le canari fait tourner deux versions simultanément.
- **Ne pas toucher à `ALLOWED_TAGS` / `ALLOWED_ATTRS`** dans `lib/utils/sanitize-html.ts`. Si quelque chose semble l'exiger : s'arrêter et le signaler.
- **Requêtes en lecture seule sur la base distante acceptées ; jamais d'écriture.**

## Ce que la session du lot A a appris, et qui s'applique ici

Quatre correctifs sur douze ont été trouvés en **interrogeant la production**, aucun en raisonnant sur le code. Deux tests ont été livrés incapables d'échouer. Un ruling a été consigné faux d'un facteur dix-huit parce qu'il déduisait au lieu de mesurer.

Trois règles en découlent, applicables à chaque tâche :

1. **Un test qui garde une valeur doit être cassé avant d'être livré.** On mute ce qu'il protège, on vérifie qu'il rougit, on restaure. Le rapport porte la sortie d'échec.
2. **Un chiffre sur les données se mesure, jamais ne se déduit.** « Combien de lignes sont concernées » est une requête, pas un raisonnement.
3. **Du HTML produit doit survivre au sanitizer à l'égalité stricte.** Un `toContain` passe pendant qu'une balise disparaît du milieu du document.

---

# Phase 1 — Le modèle de révision

Livrable seul. À son terme, un administrateur peut faire relire ses fiches publiées depuis Claude Desktop et appliquer ce qui lui convient.

## Task 1 : Table `content_revisions`

**Fichiers :** `lib/db/schema.ts`, `drizzle/*.sql` (généré)

Ajouter à la fin de `lib/db/schema.ts`, en suivant le patron de `auditLog` :

```ts
// =============================================================================
// Révisions de contenu
// =============================================================================

/**
 * Une proposition de modification déposée par un client IA, non appliquée.
 * Le MCP n'écrit jamais directement sur une ligne publiée : il dépose ici, et
 * l'administrateur applique. `payload` est DÉJÀ assaini au dépôt, avec la
 * portée de la ligne cible — voir lib/db/revisions.ts.
 */
export const contentRevisions = sqliteTable("content_revisions", {
  id: text("id").primaryKey(),
  target_type: text("target_type").notNull(),      // "product" | "banner"
  target_id: text("target_id").notNull(),
  kind: text("kind").notNull().default("update"),  // "update" | "publish"
  payload: text("payload").notNull(),              // JSON des colonnes proposées
  origin: text("origin").notNull(),                // "mcp" | "admin_chat"
  actor_id: text("actor_id").notNull(),
  actor_name: text("actor_name").notNull(),
  summary: text("summary"),                        // une phrase, écrite par le modèle
  status: text("status").notNull().default("pending"),
  base_version: text("base_version"),              // updated_at de la cible au dépôt
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  resolved_at: text("resolved_at"),
  resolved_by: text("resolved_by"),
}, (table) => [
  index("idx_revisions_target").on(table.target_type, table.target_id),
  index("idx_revisions_status").on(table.status),
  index("idx_revisions_created").on(table.created_at),
]);
```

`base_version` porte le `updated_at` de la ligne cible **au moment du dépôt**. C'est lui qui permet au § 2.5 du spec de refuser une application sur une fiche modifiée depuis.

**Puis :** `npm run db:generate`, relire le SQL produit, `npm run db:migrate`, committer `schema.ts` + `drizzle/*.sql` + `drizzle/meta/`.

**Critères d'acceptation**
- La migration passe `check-migration-safety.mjs` (aucun DROP).
- `npm run db:studio` montre la table.
- Aucune colonne `NOT NULL` sans défaut sur une table existante.

---

## Task 2 : Dépôt et lecture — `lib/db/revisions.ts`

**Fichier neuf.** Suit les conventions de `lib/db/product-drafts.ts` : Drizzle, erreurs typées, audit dans le même `db.batch()` que la mutation.

```ts
import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { contentRevisions, products, banners, auditLog } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

export type RevisionTarget = "product" | "banner";
export type RevisionKind = "update" | "publish";
export type RevisionOrigin = "mcp" | "admin_chat";

export class RevisionError extends Error {
  constructor(
    public code: "not_found" | "conflict" | "validation_error",
    message: string,
  ) {
    super(message);
  }
}

export interface RevisionActor {
  id: string;
  name: string;
}

/**
 * Les colonnes d'un produit qui portent du HTML libre et doivent donc être
 * assainies avec la portée de la ligne. Toute colonne ajoutée ici plus tard
 * DOIT l'être aussi dans la table équivalente des bannières si elle s'y
 * applique — une surface assainie d'un côté et pas de l'autre est le défaut
 * qui a coûté trois revues au lot A.
 */
const PRODUCT_HTML_COLUMNS = ["description", "faq_html"] as const;
const BANNER_HTML_COLUMNS = ["content_html"] as const;

/** La portée d'assainissement d'une cible. Un produit : son id nu. Une
 *  bannière : `banner-<id>`, parce que le hero rend dans `desc-banner-<id>`. */
export function scopeFor(target: RevisionTarget, id: string): string {
  return target === "banner" ? `banner-${id}` : id;
}

/**
 * Assainit les colonnes HTML d'un payload avant stockage. Une révision ne doit
 * JAMAIS contenir du HTML non assaini : sinon la garantie dépendrait du moment
 * de l'application, et une révision déposée aujourd'hui, appliquée dans un mois
 * par un code modifié entre-temps, échapperait au contrôle.
 */
export function sanitizePayload(
  target: RevisionTarget,
  targetId: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const columns = target === "banner" ? BANNER_HTML_COLUMNS : PRODUCT_HTML_COLUMNS;
  const scope = scopeFor(target, targetId);
  const out = { ...payload };
  for (const col of columns) {
    const v = out[col];
    if (typeof v === "string" && v.trim()) {
      out[col] = sanitizeDescriptionHtml(v, scope);
    }
  }
  return out;
}

export async function createRevision(input: {
  target: RevisionTarget;
  targetId: string;
  kind: RevisionKind;
  payload: Record<string, unknown>;
  origin: RevisionOrigin;
  actor: RevisionActor;
  summary?: string | null;
}): Promise<{ revisionId: string; status: "pending" }> {
  const db = await getDrizzle();

  // La cible doit exister, et on capture sa version pour le contrôle à
  // l'application.
  const baseVersion = await readTargetVersion(db, input.target, input.targetId);
  if (baseVersion === null) {
    throw new RevisionError("not_found", "Cible introuvable.");
  }

  const id = nanoid();
  const payload = sanitizePayload(input.target, input.targetId, input.payload);

  await db.batch([
    db.insert(contentRevisions).values({
      id,
      target_type: input.target,
      target_id: input.targetId,
      kind: input.kind,
      payload: JSON.stringify(payload),
      origin: input.origin,
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      summary: input.summary ?? null,
      base_version: baseVersion,
    }),
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      action: `revision.created.${input.kind}`,
      target_type: input.target,
      target_id: input.targetId,
      details: JSON.stringify({ via: input.origin, revisionId: id }),
    }),
  ]);

  return { revisionId: id, status: "pending" };
}
```

`readTargetVersion` lit `updated_at` sur `products` ou `banners` selon la cible, et renvoie `null` si la ligne n'existe pas. L'implémenteur l'écrit ; le reste du fichier en donne la forme.

Ajouter aussi `listPendingRevisions(target?, targetId?)` et `getRevision(id)`, tous deux en Drizzle, renvoyant le `payload` déjà désérialisé.

**Tests** — `__tests__/unit/lib/db/revisions.test.ts`
- `sanitizePayload` assainit `description` et `faq_html` d'un produit avec **l'id nu**, et `content_html` d'une bannière avec **`banner-<id>`**. Asserter la portée présente dans la sortie, pas seulement qu'une valeur a été écrite.
- Une colonne non-HTML (`base_price`) traverse `sanitizePayload` **inchangée**.
- Une valeur vide ou absente n'est pas assainie (pas de `""` produit là où il y avait `undefined`).
- `createRevision` sur une cible inexistante lève `RevisionError("not_found")`.
- `createRevision` écrit la révision **et** la ligne d'audit dans le même batch.

**Preuve de discrimination obligatoire :** muter la portée passée à `sanitizeDescriptionHtml` (une chaîne fixe), vérifier que le test de portée rougit, restaurer. Sortie d'échec dans le rapport.

---

## Task 3 : Application d'une révision

**Fichier :** `lib/db/revisions.ts` (suite), `actions/admin/revisions.ts` (neuf)

L'application est la partie où une erreur coûte cher. Elle doit, dans un seul `db.batch()` :

1. **Contrôler la version.** Si `updated_at` de la cible diffère de `base_version`, refuser avec `RevisionError("conflict")` — la fiche a changé depuis le dépôt, la proposition est peut-être fondée sur un état disparu.
2. **Écrire les colonnes** du payload sur la cible.
3. Pour une révision `kind: "publish"`, écrire aussi `is_draft = 0`.
4. **Passer la révision en `applied`**, avec `resolved_at` et `resolved_by`.
5. **Passer en `superseded`** toute autre révision `pending` de la même cible.
6. **Journaliser** dans `audit_log` avec `details.via`.

```ts
export async function applyRevision(
  revisionId: string,
  actor: RevisionActor,
): Promise<{ applied: true; superseded: number }> {
  const db = await getDrizzle();
  const rev = await getRevision(revisionId);
  if (!rev) throw new RevisionError("not_found", "Révision introuvable.");
  if (rev.status !== "pending") {
    throw new RevisionError("conflict", `Révision déjà ${rev.status}.`);
  }

  const current = await readTargetVersion(db, rev.target_type, rev.target_id);
  if (current === null) {
    throw new RevisionError("not_found", "La cible a disparu depuis le dépôt.");
  }
  if (current !== rev.base_version) {
    throw new RevisionError(
      "conflict",
      "La fiche a changé depuis le dépôt de cette révision. Demandez une " +
      "proposition fraîche plutôt que d'appliquer celle-ci.",
    );
  }
  // … batch : update cible + update révision + supersede + audit
}
```

**Le message de conflit est visible par un humain** : il dit quoi faire, pas seulement que ça a échoué.

**Server Action** `applyRevisionAction(revisionId)` et `rejectRevisionAction(revisionId)` dans `actions/admin/revisions.ts`, derrière `requireAdmin()`, renvoyant `ActionResult`, avec `revalidatePath` sur la fiche concernée **et** sur `/` si la cible est une bannière.

**Tests** — dans le même fichier
- Appliquer sur une cible modifiée depuis le dépôt lève `conflict` et **n'écrit rien**.
- Appliquer passe les autres `pending` de la même cible en `superseded`, et ne touche pas celles d'une autre cible.
- Une révision `publish` écrit `is_draft = 0`.
- Rejeter ne touche pas la cible.

**Preuve de discrimination :** retirer le contrôle de version, vérifier que le test de conflit rougit.

---

## Task 4 : Écran de validation

**Fichiers :** `app/(admin)/revisions/page.tsx`, `app/(admin)/revisions/[id]/page.tsx`, `components/admin/revision-diff.tsx`

La liste montre les révisions `pending` : cible, origine, auteur, résumé, date. Le détail montre la comparaison.

**Le détail compare les rendus, pas les sources.** Côte à côte : à gauche le contenu actuel de la cible, à droite le contenu proposé, tous deux dans un conteneur portant la classe de portée correcte (`desc-<productId>` ou `desc-banner-<id>`) et avec le vocabulaire `nk-` chargé — donc rendus dans l'application, pas dans une iframe, pour que `globals.css` s'applique.

Une révision `kind: "publish"` **n'a pas d'état antérieur** : l'écran montre la fiche complète telle qu'elle paraîtra, en une colonne. La logique de décision va dans une fonction pure testable :

```ts
export function revisionLayout(kind: RevisionKind): "side-by-side" | "single" {
  return kind === "publish" ? "single" : "side-by-side";
}
```

Les avertissements de `checkDesignConformance` s'affichent à côté du rendu proposé, **sans bloquer** l'application — cohérent avec le lot A, où le contrôle avertit et ne refuse jamais.

**Critères d'acceptation**
- Appliquer depuis l'écran met la fiche à jour et fait disparaître la révision de la liste.
- Un conflit de version affiche le message de la Task 3, pas une erreur générique.
- `revisionLayout` est testée pour les deux valeurs.

---

# Phase 2 — Généralisation des outils

## Task 5 : `get_product` lit aussi les fiches publiées

`getDraft` porte deux gardes `is_draft = 1` dans `lib/db/product-drafts.ts`. En lecture, elles sautent.

Renommer l'outil `get_product_draft` → `get_product`, en gardant l'ancien nom **en alias déprécié pendant un lot** : des clients MCP enregistrés l'utilisent, et 2.0.0 vient déjà de leur retirer `story`.

La réponse indique si la fiche est publiée, pour que le modèle sache que ses modifications passeront par une révision.

## Task 6 : `update_product` route selon l'état

Le cœur de la phase. La décision est pure et doit être testée comme telle :

```ts
/** Où va une écriture, selon l'état de la cible. Un brouillon s'écrit
 *  directement (comportement du lot A) ; une fiche publiée passe par une
 *  révision que l'administrateur applique. */
export function writePath(isDraft: boolean): "direct" | "revision" {
  return isDraft ? "direct" : "revision";
}
```

**La réponse de l'outil dit ce qui s'est passé.** Une écriture directe renvoie la fiche modifiée ; un dépôt de révision renvoie `{ revision: { id, status: "pending" }, message: "…" }` avec où la valider. Un outil qui laisserait croire à une écriture appliquée reproduirait la perte silencieuse qu'il a fallu trois revues pour débusquer sur `story`.

## Task 7 : Images et variantes, même routage

`add_product_images`, `remove_product_image`, `set_product_variants` suivent `writePath`. `delete_product_draft` **reste borné aux brouillons** — supprimer une fiche en ligne n'est pas une modification de contenu.

Attention : une image ajoutée à une fiche publiée est téléversée dans R2 **au dépôt**, pas à l'application. Le payload de la révision porte la clé R2, pas l'URL source. Sinon l'application pourrait échouer sur un téléchargement, longtemps après que le modèle a rendu la main.

**Conséquence à traiter :** une révision rejetée laisse un objet orphelin dans R2. Le rejet doit le supprimer. L'implémenteur le signale s'il trouve un cas où ce n'est pas possible.

## Task 8 : `publish_product`

Dépose une révision `kind: "publish"` avec un payload vide — c'est l'état `is_draft` qui change, pas le contenu. Refuse si la fiche est déjà publiée (`conflict`).

**Aucun outil de dépublication n'est exposé.** Ce n'est pas un oubli : l'ajouter demande une décision explicite.

---

# Phase 3 — Bannières

## Task 9 : `get_banner`, `update_banner`, `create_banner`

Les quatre bannières sont toutes publiées : **toute écriture passe par une révision**, sans routage.

`create_banner` est le cas particulier du lot A qui revient : la portée dépend de l'id, qui n'existe pas avant l'INSERT. Une révision de création n'a donc pas de cible existante — deux issues, à trancher par l'implémenteur qui les documente :

- soit `create_banner` crée la bannière **inactive** puis dépose une révision d'activation ;
- soit la table accepte `target_id` nul pour une révision de création, et l'id est attribué à l'application.

La première réutilise tout ce qui existe et ne touche pas au schéma. Je la recommande, et l'implémenteur la contredit s'il voit mieux.

---

# Phase 4 — Images

## Task 10 : `search_product_images`

`lib/media/image-search.ts` existe, testé, sans appelant depuis le lot A. L'outil l'expose.

**Il propage l'échec typé tel quel.** `{ ok: false, reason: "no_api_key" }` devient `fail("internal_error", "Clé Brave absente…")`, pas une liste vide. Un résultat vide se lit « aucune image trouvée » et envoie chercher ailleurs.

La recherche **ne télécharge rien**. Elle montre au modèle à quoi ressemble le produit ; l'attachement passe par `add_product_images` ou par la Task 12.

## Task 11 : Quota et budget

**Fichier neuf :** `lib/ai/image-budget.ts` — le nom du répertoire est réutilisé, son contenu d'avant a été supprimé au lot A et ne revient pas.

Deux barrières :

```ts
/** Clé mensuelle du compteur d'images. Le mois fait partie de la clé plutôt
 *  qu'une colonne, pour qu'un mois révolu expire tout seul. */
export function monthKey(now: Date): string {
  return `ai:images:${now.toISOString().slice(0, 7)}`;
}
```

- **Par fenêtre** : `lib/rate-limit/kv-window-limit.ts`, déjà en service.
- **Par mois** : compteur KV sur `monthKey`, plafond dans une variable d'environnement.

Le dépassement renvoie `fail("limit_exceeded", …)` avec l'usage et le plafond **dans le message** : un plafond atteint sans dire lequel oblige à lire le code pour comprendre.

**Le budget compte les images produites, pas les appels.** Une génération échouée ne consomme rien — décrémenter en cas d'échec, ou n'incrémenter qu'au succès.

**Test de discrimination :** avec un plafond à 1, la deuxième génération échoue ; avec un échec de génération, le compteur ne bouge pas.

## Task 12 : `generate_product_image`

Moteur `grok-imagine-image-2.0`, en **mode édition**.

| entrée | contrainte |
| --- | --- |
| `product_id` | la fiche visée |
| `source_image_id` | une image **déjà attachée au produit** — pas une URL |
| `prompt` | le contexte à composer |

La source est une image déjà en R2 : c'est ce qui garantit que le visuel montre le produit livré. Sur une boutique en paiement à la livraison, un visuel qui ne correspond pas se paie en colis refusé.

Le résultat repasse par `lib/storage/fetch-image.ts` — garde SSRF, plafond 5 Mo, délai 10 s — puis monte dans R2. **Ne pas ouvrir un second chemin de téléchargement** qui contournerait cette garde : elle vient d'être durcie contre les formes IPv6 en 2.0.0.

La clé xAI est un secret d'environnement, déclaré dans `env.d.ts`. **Pas de table de configuration** : `ai_config` est condamnée et ne ressuscite pas.

---

# Phase 5 — Surface conversationnelle

Optionnelle. Elle ne débloque rien, et si travailler depuis Claude Desktop suffit, elle se supprime du lot sans toucher au reste.

## Task 13 : Route de chat

`app/api/admin/chat/route.ts`, `runtime = "edge"`, derrière `requireAdmin()`. TanStack AI : `chat()` + `toServerSentEventsResponse()`.

Les outils exposés au modèle sont **les outils MCP**, pas des copies. S'ils ne sont pas réutilisables tels quels, c'est la couche d'outils qu'il faut adapter — pas dupliquer.

## Task 14 : Page d'administration

L'administrateur décrit ce qu'il veut, voit les outils s'exécuter, et retrouve les révisions déposées avec leur lien vers l'écran de la Task 4.

## Task 15 : Test de non-régression d'architecture

Le test qui garde la règle du § 1 du spec :

```ts
/**
 * Le lot A a retiré un pipeline IA embarqué qui avait ses propres écritures.
 * La surface conversationnelle du lot B est un CLIENT de la couche d'outils,
 * pas un second pipeline. Ce test garde cette frontière : si elle s'érode, ce
 * sera par un raccourci qui semblera innocent au moment de l'écrire.
 */
it("aucune page d'administration n'importe un client de fournisseur d'IA", () => {
  // Parcourt app/(admin)/** et components/admin/**, échoue sur un import de
  // @anthropic-ai/*, openai, @tanstack/ai-* hors de la route de chat.
});
```

Il lit les sources avec `readFileSync`, comme `__tests__/unit/admin-page-guards.test.ts` le fait déjà.

**Preuve de discrimination obligatoire :** ajouter un tel import dans un composant d'administration, vérifier que le test rougit, retirer.

---

# Séquencement de livraison

| PR | contenu | valeur livrée |
| --- | --- | --- |
| 1 | Tasks 1-4 | Relire ses fiches publiées depuis Claude Desktop et appliquer |
| 2 | Tasks 5-8 | Le MCP couvre tout le catalogue |
| 3 | Task 9 | Les bannières |
| 4 | Tasks 10-12 | Les images |
| 5 | Tasks 13-15 | La surface conversationnelle |

Chaque PR se promeut avant la suivante : un canari non promu devient orphelin à la fusion d'après. L'issue « Pending promotion » est le rappel visuel.

# Questions ouvertes

- **Le plafond mensuel d'images** n'a pas de valeur ; elle dépend du budget xAI réel.
- **La création de bannière par révision** (Task 9) a deux formes possibles ; je recommande la première, l'implémenteur tranche et documente.
- **La surface conversationnelle** peut être abandonnée, auquel cas la Task 15 migre en phase 2 pour garder la frontière écrite.
