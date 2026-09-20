import { and, desc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, banners, contentRevisions, products } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

/**
 * Dépôt et lecture des révisions (`content_revisions`) pour le MCP et la
 * surface conversationnelle. Suit les conventions de `lib/db/product-drafts.ts` :
 * Drizzle, erreurs typées, audit dans le même `db.batch()` que la mutation.
 *
 * L'application d'une révision (passage à `applied`) est hors périmètre de ce
 * fichier — voir le lot B, tâche 3.
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
