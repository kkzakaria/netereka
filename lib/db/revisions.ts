import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, banners, contentRevisions, products } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import type { AuditAction } from "@/lib/db/types";

/**
 * Dépôt, lecture et application des révisions (`content_revisions`) pour le
 * MCP et la surface conversationnelle. Suit les conventions de
 * `lib/db/product-drafts.ts` : Drizzle, erreurs typées, audit dans le même
 * `db.batch()` que la mutation.
 */

export type RevisionTarget = "product" | "banner";
export type RevisionKind = "update" | "publish";
export type RevisionOrigin = "mcp" | "admin_chat";
export type RevisionStatus = "pending" | "applied" | "rejected" | "superseded";

export class RevisionError extends Error {
  constructor(
    public code: "not_found" | "conflict" | "validation_error",
    message: string,
  ) {
    super(message);
    this.name = "RevisionError";
  }
}

export interface RevisionActor {
  id: string;
  name: string;
}

type Statement = BatchItem<"sqlite">;
type Batch = [Statement, ...Statement[]];

/**
 * Les colonnes d'un produit qui portent du HTML libre et doivent donc être
 * assainies avec la portée de la ligne. Toute colonne ajoutée ici plus tard
 * DOIT l'être aussi dans la table équivalente des bannières si elle s'y
 * applique — une surface assainie d'un côté et pas de l'autre est le défaut
 * qui a coûté trois revues au lot A.
 */
// Exportées : l'écran de validation (components/admin/revision-diff.tsx) en a
// besoin pour distinguer, dans un payload, les colonnes de HTML libre (rendues
// côte à côte, avec la classe de portée) des colonnes simples (affichées en
// texte). Une seconde liste maintenue à la main dans le composant serait la
// même dérive qu'une seconde façon d'écrire `scopeFor`.
export const PRODUCT_HTML_COLUMNS = ["description", "faq_html"] as const;
export const BANNER_HTML_COLUMNS = ["content_html"] as const;

/** La portée d'assainissement d'une cible. Un produit : son id nu. Une
 *  bannière : `banner-<id>`, parce que le hero rend dans `desc-banner-<id>`. */
export function scopeFor(target: RevisionTarget, id: string): string {
  return target === "banner" ? `banner-${id}` : id;
}

/**
 * Colonnes qu'une révision a le droit de proposer, par cible — une liste
 * BLANCHE, pas une liste noire : une colonne future sur `products` ou
 * `banners` n'est écrivable par une révision qu'après avoir été ajoutée ici
 * explicitement. L'inverse (tout sauf quelques colonnes interdites) laisse
 * passer, par défaut, toute colonne simplement oubliée de la liste noire.
 *
 * Exclut délibérément, pour `products` :
 * - `id`, `slug` — les réécrire détacherait instantanément tout CSS scopé
 *   déjà stocké sous l'ancien identifiant (`.desc-<ancien-id>`), la même
 *   classe de défaut que `scopeFor` existe pour éviter ailleurs.
 * - `is_draft` — § 2.3 du spec : « la dépublication n'est pas exposée du
 *   tout », parce qu'un retrait passe inaperçu alors qu'une mise en ligne
 *   ratée se voit. `applyRevision` reste seul à le poser, et seulement pour
 *   `kind: "publish"`.
 * - `created_at`, `updated_at` — `updated_at` est géré par `applyRevision`
 *   lui-même : c'est l'horodatage de l'écriture ET la clé du contrôle de
 *   version (`base_version`), une révision ne doit donc jamais pouvoir le
 *   dicter.
 *
 * Rien n'atteint ce contrôle aujourd'hui (aucun outil ne dépose encore de
 * révision), mais `createRevision` est l'interface que les cinq outils
 * généralisés de la phase 2 vont tous consommer : la garantie doit tenir au
 * dépôt, pas dépendre de ce que chaque appelant pense à vérifier lui-même —
 * même principe que `sanitizePayload` ci-dessus.
 */
const PRODUCT_WRITABLE_COLUMNS = new Set([
  "category_id",
  "name",
  "description",
  "description_type",
  "short_description",
  "base_price",
  "compare_price",
  "sku",
  "brand",
  "is_active",
  "is_featured",
  "stock_quantity",
  "low_stock_threshold",
  "weight_grams",
  "meta_title",
  "meta_description",
  "tagline",
  "highlights",
  "feature_blocks",
  "faq",
  "faq_html",
]);

/** Pas d'`id`/`created_at`/`updated_at` — mêmes raisons que pour les
 *  produits. Les bannières n'ont ni `slug` ni `is_draft`. */
const BANNER_WRITABLE_COLUMNS = new Set([
  "title",
  "subtitle",
  "badge_text",
  "badge_color",
  "image_url",
  "link_url",
  "cta_text",
  "price",
  "bg_gradient_from",
  "bg_gradient_to",
  "content_html",
  "display_order",
  "is_active",
  "starts_at",
  "ends_at",
]);

function writableColumnsFor(target: RevisionTarget): Set<string> {
  return target === "banner" ? BANNER_WRITABLE_COLUMNS : PRODUCT_WRITABLE_COLUMNS;
}

/**
 * Refuse, AU DÉPÔT, un payload qui contiendrait une colonne hors liste
 * blanche — jamais à l'application, pour la même raison que
 * `sanitizePayload` assainit au dépôt plutôt qu'à la lecture : la garantie
 * ne doit pas dépendre du moment ni de l'appelant.
 */
function assertWritablePayload(target: RevisionTarget, payload: Record<string, unknown>): void {
  const allowed = writableColumnsFor(target);
  const rejected = Object.keys(payload).filter((key) => !allowed.has(key));
  if (rejected.length > 0) {
    throw new RevisionError(
      "validation_error",
      `Colonne(s) non autorisée(s) dans une révision : ${rejected.join(", ")}.`,
    );
  }
}

/**
 * Assainit les colonnes HTML d'un payload avant stockage. Une révision ne doit
 * JAMAIS contenir du HTML non assaini : sinon la garantie dépendrait du moment
 * de l'application, et une révision déposée aujourd'hui, appliquée dans un mois
 * par un code modifié entre-temps, échapperait au contrôle.
 *
 * Ne touche à rien d'autre que les colonnes HTML connues de la cible : une
 * colonne comme `base_price` traverse inchangée. Une valeur absente ou vide
 * n'est pas assainie — `sanitizeDescriptionHtml` renverrait `""`, et le
 * storefront distingue `null`/absent d'une chaîne vide pour la visibilité des
 * onglets.
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

/** `updated_at` de la cible, ou `null` si la ligne n'existe pas. */
async function readTargetVersion(
  db: DrizzleDB,
  target: RevisionTarget,
  targetId: string,
): Promise<string | null> {
  if (target === "banner") {
    const bannerId = Number(targetId);
    if (!Number.isInteger(bannerId)) return null;
    const row = await db
      .select({ updated_at: banners.updated_at })
      .from(banners)
      .where(eq(banners.id, bannerId))
      .limit(1)
      .get();
    return row?.updated_at ?? null;
  }
  const row = await db
    .select({ updated_at: products.updated_at })
    .from(products)
    .where(eq(products.id, targetId))
    .limit(1)
    .get();
  return row?.updated_at ?? null;
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
  // Avant toute lecture : un payload hors liste blanche est un défaut de
  // l'appelant, pas de la cible — pas besoin d'un aller-retour base pour le
  // détecter.
  assertWritablePayload(input.target, input.payload);

  const db = await getDrizzle();

  // La cible doit exister, et on capture sa version pour le contrôle à
  // l'application.
  const baseVersion = await readTargetVersion(db, input.target, input.targetId);
  if (baseVersion === null) {
    throw new RevisionError("not_found", "Cible introuvable.");
  }

  const id = nanoid();
  const payload = sanitizePayload(input.target, input.targetId, input.payload);

  // Typé explicitement : un troisième `RevisionKind` qui compilerait ici sans
  // que `AuditAction` le liste produirait une ligne d'audit sans libellé
  // (AUDIT_ACTION_LABELS, lib/constants/audit.ts) sans qu'aucun test ne le
  // signale — cette annotation fait échouer la COMPILATION à la place.
  const action: AuditAction = `revision.created.${input.kind}`;

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
      action,
      target_type: input.target,
      target_id: input.targetId,
      details: JSON.stringify({ via: input.origin, revisionId: id }),
    }),
  ] satisfies Batch);

  return { revisionId: id, status: "pending" };
}

export interface RevisionRecord {
  id: string;
  target_type: RevisionTarget;
  target_id: string;
  kind: RevisionKind;
  payload: Record<string, unknown>;
  origin: RevisionOrigin;
  actor_id: string;
  actor_name: string;
  summary: string | null;
  status: RevisionStatus;
  base_version: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

function toRevisionRecord(row: typeof contentRevisions.$inferSelect): RevisionRecord {
  return {
    id: row.id,
    target_type: row.target_type as RevisionTarget,
    target_id: row.target_id,
    kind: row.kind as RevisionKind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    origin: row.origin as RevisionOrigin,
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    summary: row.summary,
    status: row.status as RevisionStatus,
    base_version: row.base_version,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
  };
}

/** Révisions `pending`, les plus récentes d'abord, optionnellement filtrées
 *  sur une cible (type seul, ou type + id précis). */
export async function listPendingRevisions(target?: RevisionTarget, targetId?: string): Promise<RevisionRecord[]> {
  const db = await getDrizzle();
  const conditions = [eq(contentRevisions.status, "pending")];
  if (target) conditions.push(eq(contentRevisions.target_type, target));
  if (targetId !== undefined) conditions.push(eq(contentRevisions.target_id, targetId));

  const rows = await db
    .select()
    .from(contentRevisions)
    .where(and(...conditions))
    .orderBy(desc(contentRevisions.created_at))
    .all();
  return rows.map(toRevisionRecord);
}

/** Une révision par id, quel que soit son statut, ou `null` si absente. */
export async function getRevision(id: string): Promise<RevisionRecord | null> {
  const db = await getDrizzle();
  const row = await db.select().from(contentRevisions).where(eq(contentRevisions.id, id)).limit(1).get();
  return row ? toRevisionRecord(row) : null;
}

/** Message de conflit, une seule fois : affiché tel quel par l'écran de
 *  validation (pas de texte générique) — voir actions/admin/revisions.ts. */
const TARGET_CHANGED_MESSAGE =
  "La fiche a changé depuis le dépôt de cette révision. Demandez une " +
  "proposition fraîche plutôt que d'appliquer celle-ci.";

const APPLIED_ACTION: AuditAction = "revision.applied";
const REJECTED_ACTION: AuditAction = "revision.rejected";
const APPLY_CONFLICT_ACTION: AuditAction = "revision.apply_conflict";

/**
 * Répare un batch d'application dont l'écriture sur la cible n'a, en
 * réalité, rien changé (voir l'appelant, `applyRevision`, pour le
 * diagnostic). D1 ne sait pas annuler un batch déjà validé — une UPDATE à 0
 * ligne n'est pas une erreur pour SQLite, donc le reste du batch a committé
 * quand même — cette fonction répare donc APRÈS coup, dans un second batch :
 *
 * - remet `rev.id` en `pending` s'il a été marqué `applied` à tort (ne
 *   touche rien s'il est déjà `superseded` par une révision concurrente
 *   gagnante — ce cas-là n'a pas besoin de réparation, il est correct) ;
 * - remet en `pending` les révisions voisines que CE batch avait lui-même
 *   marquées `superseded` (`supersededCandidateIds`, capturé avant ce
 *   batch) — jamais une ligne superseded par un autre batch, gagnant
 *   celui-là ;
 * - journalise la correction : l'audit "applied" du batch raté reste en
 *   base (append-only, jamais supprimé), donc cette ligne existe pour que
 *   quiconque relit le journal comprenne que cette application n'a en fait
 *   jamais eu lieu.
 */
async function reconcileFailedApply(
  db: DrizzleDB,
  rev: RevisionRecord,
  actor: RevisionActor,
  supersededCandidateIds: string[],
): Promise<void> {
  const stmts: Statement[] = [
    db
      .update(contentRevisions)
      .set({ status: "pending", resolved_at: null, resolved_by: null })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "applied"))),
  ];

  if (supersededCandidateIds.length > 0) {
    stmts.push(
      db
        .update(contentRevisions)
        .set({ status: "pending", resolved_at: null, resolved_by: null })
        .where(and(
          inArray(contentRevisions.id, supersededCandidateIds),
          eq(contentRevisions.status, "superseded"),
        )),
    );
  }

  stmts.push(
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action: APPLY_CONFLICT_ACTION,
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({
        via: "admin",
        revisionId: rev.id,
        reason: "target_changed_since_deposit",
      }),
    }),
  );

  await db.batch(stmts as Batch);
}

/**
 * Écrit `payload` sur la ligne cible (produit ou bannière) et clôt la
 * révision, en un seul `db.batch()` : c'est l'écriture qui atteint le client
 * final, donc tout ou rien.
 *
 * Le contrôle de version compare `base_version` (capturé au dépôt, voir
 * `createRevision`) à l'`updated_at` actuel de la cible. S'ils diffèrent, la
 * fiche a changé depuis le dépôt — la proposition repose peut-être sur un
 * état qui n'existe plus — et on refuse plutôt que d'écraser ce changement
 * sans que personne ne l'ait vu.
 *
 * Ce contrôle, lu ci-dessus, n'est PAS à lui seul suffisant : entre cette
 * lecture et le batch plus bas, une autre écriture sur la même cible peut
 * s'intercaler — une autre révision appliquée en même temps sur la même
 * fiche, ou une édition directe du produit. Sans le répéter dans le WHERE de
 * l'écriture elle-même, la fenêtre entre lecture et écriture permettrait à
 * deux applications concurrentes de toutes les deux "réussir", la seconde
 * écrasant la première sans qu'aucun signal ne le dise. `current` (non-null
 * ici) est donc reporté tel quel comme prédicat de l'UPDATE de la cible, et
 * la ligne de révision elle-même n'est marquée `applied` que si elle est
 * encore `pending` au moment du batch — pas seulement au moment de cette
 * lecture.
 *
 * Toute autre révision `pending` de la MÊME cible passe à `superseded` :
 * deux propositions concurrentes sur la même fiche ne doivent pas pouvoir
 * s'appliquer l'une après l'autre à l'insu de qui a validé la première. Une
 * révision `pending` d'une autre cible n'est jamais touchée.
 */
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
    throw new RevisionError("conflict", TARGET_CHANGED_MESSAGE);
  }

  // Comptées avant le batch pour le retour à l'appelant. La même condition de
  // filtrage (cible + pending) est répétée dans l'UPDATE du batch ci-dessous,
  // donc l'écriture réelle reste correcte même si une nouvelle révision est
  // déposée sur cette cible entre ce SELECT et le batch — seul le nombre
  // rapporté pourrait alors sous-compter d'une unité. Réutilisée aussi par
  // `reconcileFailedApply` si l'écriture rate : ce sont exactement les
  // révisions que CE batch s'apprête à marquer `superseded`.
  const others = await db
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .where(and(
      eq(contentRevisions.target_type, rev.target_type),
      eq(contentRevisions.target_id, rev.target_id),
      eq(contentRevisions.status, "pending"),
      ne(contentRevisions.id, rev.id),
    ))
    .all();
  const otherIds = others.map((o) => o.id);

  const targetSet: Record<string, unknown> = { ...rev.payload, updated_at: sql`datetime('now')` };
  if (rev.kind === "publish" && rev.target_type === "product") {
    targetSet.is_draft = 0;
  }

  // `current` (non-null, vérifié ci-dessus) est la valeur que le
  // pré-contrôle vient de comparer à `base_version` : la reporter ici rend
  // l'écriture atomique avec ce contrôle — voir le commentaire au-dessus de
  // la fonction.
  const targetStatement =
    rev.target_type === "banner"
      ? db
          .update(banners)
          .set(targetSet as Partial<typeof banners.$inferInsert>)
          .where(and(eq(banners.id, Number(rev.target_id)), eq(banners.updated_at, current)))
      : db
          .update(products)
          .set(targetSet as Partial<typeof products.$inferInsert>)
          .where(and(eq(products.id, rev.target_id), eq(products.updated_at, current)));

  const stmts: Batch = [
    targetStatement,
    // `eq(status, "pending")` : ne marque `applied` que si rien n'a déjà
    // résolu cette révision entre la lecture ci-dessus et ce batch — sinon
    // une révision qu'une AUTRE application concurrente vient de passer
    // `superseded` (voir l'UPDATE ci-dessous, d'un batch gagnant) resterait
    // "applied" alors que ce batch-ci n'a en réalité rien écrit.
    db
      .update(contentRevisions)
      .set({ status: "applied", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "pending"))),
    // Portée sur target_type + target_id : une révision pending d'une autre
    // cible ne matche jamais cette clause et n'est donc jamais touchée.
    db
      .update(contentRevisions)
      .set({ status: "superseded", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(
        eq(contentRevisions.target_type, rev.target_type),
        eq(contentRevisions.target_id, rev.target_id),
        eq(contentRevisions.status, "pending"),
        ne(contentRevisions.id, rev.id),
      )),
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action: APPLIED_ACTION,
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({ via: "admin", revisionId: rev.id, kind: rev.kind }),
    }),
  ];

  const results = await db.batch(stmts);
  const targetResult = results[0] as D1Result;

  if ((targetResult?.meta?.changes ?? 0) === 0) {
    // Le prédicat de `targetStatement` n'a matché aucune ligne : la cible a
    // changé entre le pré-contrôle ci-dessus et ce batch (une autre
    // application concurrente sur la même cible est passée entre les deux).
    // Le batch a malgré tout committé — voir `reconcileFailedApply` — donc
    // cette ligne de révision, et éventuellement ses voisines, peuvent
    // affirmer un statut que l'écriture réelle ne soutient pas. On répare,
    // puis on renvoie le même message qu'un conflit détecté au pré-contrôle :
    // le résultat pour l'appelant est identique dans les deux cas, rien n'a
    // été écrit sur la cible.
    await reconcileFailedApply(db, rev, actor, otherIds);
    throw new RevisionError("conflict", TARGET_CHANGED_MESSAGE);
  }

  return { applied: true, superseded: others.length };
}

/**
 * Rejette une révision `pending` sans jamais écrire sur la cible : seule la
 * ligne de révision et l'audit changent.
 */
export async function rejectRevision(revisionId: string, actor: RevisionActor): Promise<{ rejected: true }> {
  const db = await getDrizzle();
  const rev = await getRevision(revisionId);
  if (!rev) throw new RevisionError("not_found", "Révision introuvable.");
  if (rev.status !== "pending") {
    throw new RevisionError("conflict", `Révision déjà ${rev.status}.`);
  }

  await db.batch([
    db
      .update(contentRevisions)
      .set({ status: "rejected", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(eq(contentRevisions.id, rev.id)),
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action: REJECTED_ACTION,
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({ via: "admin", revisionId: rev.id }),
    }),
  ] satisfies Batch);

  return { rejected: true };
}
