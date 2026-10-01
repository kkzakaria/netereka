import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

/**
 * Deux barrières devant la génération d'images, toutes deux rendant un échec
 * typé et nommé.
 *
 * Le répertoire `lib/ai/` réutilise un nom : son contenu d'avant (le pipeline
 * embarqué, sa table `ai_config`, sa clé propre) a été supprimé au lot A et ne
 * revient pas. Ici, aucune configuration en base : le plafond et la clé sont
 * des secrets d'environnement, déclarés dans `env.d.ts`.
 *
 * `grok-imagine-image-2.0` est facturé à l'image. Les deux barrières ne
 * protègent donc pas la même chose :
 *
 * - **par fenêtre** (`checkKVRateLimit`, déjà en service pour les commandes,
 *   le rapport CSP et les promos) : contre la rafale — une boucle du modèle
 *   qui réessaie, un script lancé deux fois. Elle compte les TENTATIVES, y
 *   compris celles qui échoueront : c'est ce qu'un garde-fou de rafale doit
 *   faire, sinon une série d'échecs ne serait jamais freinée ;
 * - **par mois** : contre la dépense. Elle compte les IMAGES PRODUITES, pas
 *   les appels — une génération qui échoue ne consomme rien, parce que
 *   personne n'a reçu (ni payé) d'image.
 *
 * Le compteur mensuel n'est donc PAS incrémenté par `checkImageBudget` :
 * l'appelant appelle `recordImagesProduced` après coup, une fois l'image
 * réellement produite. Les deux fonctions sont séparées pour cette raison.
 */

/** Plafond par fenêtre et par administrateur. Il borne la rafale, pas la
 *  dépense du mois : il est volontairement généreux pour qu'une session de
 *  travail normale ne le touche jamais. */
export const MAX_GENERATIONS_PER_WINDOW = 10;
export const WINDOW_SECONDS = 3600;

/** Nom du secret/variable portant le plafond mensuel. Exporté pour que le
 *  message d'erreur de l'outil et les tests le nomment depuis une seule
 *  source. */
export const MONTHLY_LIMIT_ENV = "AI_IMAGE_MONTHLY_LIMIT";

/**
 * Clé mensuelle du compteur d'images. Le mois fait partie de la clé plutôt
 * qu'une colonne, pour qu'un mois révolu expire tout seul.
 *
 * `toISOString()` est en UTC : le mois bascule à minuit UTC, pas à minuit
 * d'Abidjan. Abidjan est à UTC+0 toute l'année (pas d'heure d'été), donc pour
 * cette boutique les deux coïncident.
 */
export function monthKey(now: Date): string {
  return `ai:images:${now.toISOString().slice(0, 7)}`;
}

/** Clé de la fenêtre glissante, par administrateur : le plafond de rafale est
 *  individuel, le plafond mensuel est commun à la boutique (c'est une
 *  facture, pas un droit d'usage). */
function windowKey(actorId: string): string {
  return `ai:images:rate:${actorId}`;
}

/**
 * TTL de la clé mensuelle : l'instant absolu du 1er du mois +2, pas une durée
 * depuis l'écriture. Écrit comme une durée, chaque incrément repousserait
 * l'expiration (le défaut corrigé dans `kv-window-limit.ts`) ; calculé depuis
 * la frontière de mois, dix incréments visent la même échéance. Le mois +2
 * laisse un mois de marge pour relire le compteur d'un mois clos.
 */
function monthTtlSeconds(now: Date): number {
  const expiry = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1);
  return Math.max(60, Math.ceil((expiry - now.getTime()) / 1000));
}

export type MonthlyUsage =
  | { ok: true; used: number }
  /** La clé existe mais ne porte pas un entier : on ne SAIT pas où on en est.
   *  Lire 0 ici, ce serait rendre la dépense illimitée sur une valeur
   *  corrompue — exactement le défaut par défaut qu'on refuse. */
  | { ok: false; reason: "usage_unreadable"; raw: string };

/** Compteur du mois en cours. Absent = 0 (première image du mois), ce qui est
 *  légitime et se distingue d'une valeur illisible. */
export async function readMonthlyUsage(kv: KVNamespace, now: Date): Promise<MonthlyUsage> {
  const raw = await kv.get(monthKey(now));
  if (raw === null) return { ok: true, used: 0 };
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "usage_unreadable", raw };
  const used = Number(trimmed);
  if (!Number.isSafeInteger(used)) return { ok: false, reason: "usage_unreadable", raw };
  return { ok: true, used };
}

/**
 * Plafond mensuel lu dans l'environnement.
 *
 * **Absent ⇒ refus**, jamais « illimité ». Le plan laissait cette valeur
 * ouverte (elle dépend du budget xAI réel, que l'administrateur n'a pas
 * tranché) ; sur une dépense facturée à l'appel, l'absence de borne est le
 * pire comportement par défaut qu'on puisse choisir. Une valeur illisible est
 * distinguée d'une valeur absente pour que le message dise quoi corriger.
 *
 * `0` est une valeur VALIDE : elle désactive la génération explicitement, ce
 * qui n'est pas la même chose que ne pas avoir décidé.
 */
export type MonthlyLimit =
  | { ok: true; limit: number }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "limit_unreadable"; raw: string };

export function parseMonthlyLimit(raw: string | undefined | null): MonthlyLimit {
  if (raw === undefined || raw === null || raw.trim() === "") return { ok: false, reason: "not_configured" };
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "limit_unreadable", raw };
  const limit = Number(trimmed);
  if (!Number.isSafeInteger(limit)) return { ok: false, reason: "limit_unreadable", raw };
  return { ok: true, limit };
}

export type BudgetDecision =
  | { ok: true; used: number; limit: number; remaining: number }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "limit_unreadable"; raw: string }
  | { ok: false; reason: "usage_unreadable"; raw: string }
  | { ok: false; reason: "monthly_budget_exceeded"; used: number; limit: number }
  | { ok: false; reason: "rate_limited"; max: number; windowSeconds: number };

/**
 * Autorise (ou non) UNE image de plus. N'incrémente PAS le compteur mensuel —
 * voir le commentaire de tête.
 *
 * L'ordre des trois contrôles est délibéré :
 *
 * 1. le plafond, parce qu'un déploiement non configuré ne doit pas consommer
 *    un jeton de rafale pour apprendre qu'il n'est pas configuré ;
 * 2. l'usage du mois, pour la même raison ;
 * 3. la fenêtre en DERNIER, parce que c'est le seul des trois qui écrit : un
 *    refus budgétaire ne doit pas entamer le quota de rafale.
 *
 * KV est à cohérence éventuelle et n'a pas d'incrément atomique : deux appels
 * simultanés peuvent tous deux voir `used = limit - 1` et produire une image
 * de trop. Compromis assumé, le même que `kv-window-limit.ts` : le but est de
 * borner la facture, pas de compter à l'unité. Avec un seul administrateur
 * derrière un outil conversationnel, la fenêtre de course est étroite.
 */
export async function checkImageBudget(opts: {
  kv: KVNamespace;
  limitRaw: string | undefined | null;
  actorId: string;
  now?: Date;
}): Promise<BudgetDecision> {
  const now = opts.now ?? new Date();

  const limit = parseMonthlyLimit(opts.limitRaw);
  if (!limit.ok) return limit;

  const usage = await readMonthlyUsage(opts.kv, now);
  if (!usage.ok) return usage;

  if (usage.used >= limit.limit) {
    return { ok: false, reason: "monthly_budget_exceeded", used: usage.used, limit: limit.limit };
  }

  const allowed = await checkKVRateLimit(
    opts.kv,
    windowKey(opts.actorId),
    { max: MAX_GENERATIONS_PER_WINDOW, windowSeconds: WINDOW_SECONDS },
    now.getTime(),
  );
  if (!allowed) {
    return { ok: false, reason: "rate_limited", max: MAX_GENERATIONS_PER_WINDOW, windowSeconds: WINDOW_SECONDS };
  }

  return { ok: true, used: usage.used, limit: limit.limit, remaining: limit.limit - usage.used };
}

/**
 * Enregistre `count` images RÉELLEMENT produites. À n'appeler qu'après coup :
 * c'est ce qui fait que le compteur suit la facture et non le trafic.
 *
 * Renvoie le nouveau total. Lève si KV refuse l'écriture — l'appelant décide
 * quoi faire d'une image déjà payée mais non comptée, et surtout le dit dans
 * sa réponse : une perte de comptage silencieuse déplafonnerait le mois.
 */
export async function recordImagesProduced(kv: KVNamespace, count: number, now: Date = new Date()): Promise<number> {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error(`recordImagesProduced: count doit être un entier positif (reçu ${count})`);
  }
  const usage = await readMonthlyUsage(kv, now);
  // Une valeur illisible repart de `count` plutôt que de bloquer l'écriture :
  // `checkImageBudget` a déjà refusé en amont sur cette même lecture, donc on
  // n'arrive ici que si la valeur s'est corrompue entre-temps, et un compteur
  // qui redémarre vaut mieux qu'un compteur qui n'avance plus.
  const next = (usage.ok ? usage.used : 0) + count;
  await kv.put(monthKey(now), String(next), { expirationTtl: monthTtlSeconds(now) });
  return next;
}
