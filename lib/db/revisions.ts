import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, banners, contentRevisions, products } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

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
    throw new RevisionError(
      "conflict",
      "La fiche a changé depuis le dépôt de cette révision. Demandez une " +
      "proposition fraîche plutôt que d'appliquer celle-ci.",
    );
  }

  // Comptées avant le batch pour le retour à l'appelant. La même condition de
  // filtrage (cible + pending) est répétée dans l'UPDATE du batch ci-dessous,
  // donc l'écriture réelle reste correcte même si une nouvelle révision est
  // déposée sur cette cible entre ce SELECT et le batch — seul le nombre
  // rapporté pourrait alors sous-compter d'une unité.
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

  const targetSet: Record<string, unknown> = { ...rev.payload, updated_at: sql`datetime('now')` };
  if (rev.kind === "publish" && rev.target_type === "product") {
    targetSet.is_draft = 0;
  }

  const targetStatement =
    rev.target_type === "banner"
      ? db
          .update(banners)
          .set(targetSet as Partial<typeof banners.$inferInsert>)
          .where(eq(banners.id, Number(rev.target_id)))
      : db
          .update(products)
          .set(targetSet as Partial<typeof products.$inferInsert>)
          .where(eq(products.id, rev.target_id));

  const stmts: Batch = [
    targetStatement,
    db
      .update(contentRevisions)
      .set({ status: "applied", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(eq(contentRevisions.id, rev.id)),
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
      action: "revision.applied",
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({ via: "admin", revisionId: rev.id, kind: rev.kind }),
    }),
  ];

  await db.batch(stmts);
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
      action: "revision.rejected",
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({ via: "admin", revisionId: rev.id }),
    }),
  ] satisfies Batch);

  return { rejected: true };
}
