import { eq, sql } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { aiImageUsage } from "@/lib/db/schema";
import { checkKVRateLimit } from "@/lib/rate-limit/kv-window-limit";

/**
 * Deux barrières devant la génération d'images, toutes deux rendant un échec
 * typé et nommé.
 *
 * Le répertoire `lib/ai/` réutilise un nom : son contenu d'avant (le pipeline
 * embarqué, sa table `ai_config`, sa clé propre) a été supprimé au lot A et ne
 * revient pas. Il n'y a donc toujours AUCUNE table de configuration ici : le
 * plafond et la clé restent des secrets d'environnement, déclarés dans
 * `env.d.ts`. `ai_image_usage` est un compteur, pas une configuration.
 *
 * `grok-imagine-image-2.0` est facturé à l'image. Les deux barrières ne
 * protègent donc pas la même chose :
 *
 * - **par fenêtre** (`checkKVRateLimit`, déjà en service pour les commandes,
 *   le rapport CSP et les promos), en KV : contre la rafale — une boucle du
 *   modèle qui réessaie, un script lancé deux fois. Elle compte les
 *   TENTATIVES, y compris celles qui échoueront : c'est ce qu'un garde-fou de
 *   rafale doit faire, sinon une série d'échecs ne serait jamais freinée. Une
 *   fenêtre approximative est sans conséquence financière, donc KV convient ;
 * - **par mois**, en D1 : contre la dépense. Elle compte les IMAGES
 *   PRODUITES, pas les appels — une génération qui échoue ne consomme rien,
 *   parce que personne n'a reçu d'image.
 *
 * **Pourquoi le compteur mensuel est en D1 alors que le plan le voulait en
 * KV.** Le plan mettait le mois dans la clé « pour qu'un mois révolu expire
 * tout seul ». Mais KV n'a pas d'incrément atomique : l'incrément s'écrivait
 * en lire-modifier-écrire, et deux appels concurrents ne produisaient pas
 * « une image de trop » — ils PERDAIENT un incrément. Mesuré : deux appels
 * simultanés, deux images produites, compteur à 1 ; en pire cas de
 * propagation, dix images produites pour un compteur à 1 avec un plafond à 3.
 * Un plafond qui prétend borner une dépense doit la borner, sinon la seule
 * borne réelle est la fenêtre de rafale (dix par heure et par administrateur,
 * soit de l'ordre de sept mille par mois). Douze lignes par an sont un coût
 * nul en regard. L'upsert de `recordImagesProduced` est atomique en UNE
 * instruction, donc deux incréments concurrents donnent bien deux.
 *
 * Le compteur mensuel n'est pas incrémenté par `checkImageBudget` :
 * l'appelant appelle `recordImagesProduced` après coup, une fois l'image
 * réellement produite. Les deux fonctions sont séparées pour cette raison.
 *
 * **Ce que le compteur mesure exactement.** Des images produites, pas des
 * francs : xAI facture l'image d'ENTRÉE et celle de SORTIE, et le palier de
 * qualité pèse sur le prix. `image-generation.ts` fixe `quality`
 * explicitement pour que ce palier soit un choix et non un défaut hérité,
 * mais le rapport image → facture n'est pas de un pour un. Le plafond borne
 * donc le VOLUME, ce qui borne la dépense à un facteur près et constant.
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
 * qu'une colonne, pour qu'un mois se lise sans borne de dates.
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

export type MonthlyUsage =
  | { ok: true; used: number }
  /**
   * La LECTURE a échoué (D1 indisponible) : on ne sait pas où en est la
   * dépense du mois. Le principe survit au passage de KV à D1 — une valeur
   * corrompue n'est plus représentable dans une colonne `INTEGER NOT NULL`,
   * mais une lecture impossible, si. Et dans ce cas il faut REFUSER, jamais
   * repartir de zéro : repartir de zéro déplafonnerait le mois entier sur une
   * panne passagère.
   */
  | { ok: false; reason: "usage_unavailable"; detail: string };

/** Compteur du mois en cours. Ligne absente = 0 (première image du mois), ce
 *  qui est légitime et se distingue d'une lecture impossible. */
export async function readMonthlyUsage(now: Date): Promise<MonthlyUsage> {
  try {
    const db = await getDrizzle();
    const row = await db
      .select({ used: aiImageUsage.used })
      .from(aiImageUsage)
      .where(eq(aiImageUsage.month_key, monthKey(now)))
      .limit(1)
      .get();
    return { ok: true, used: row?.used ?? 0 };
  } catch (err) {
    console.error("[image-budget] lecture du compteur mensuel impossible", err);
    return { ok: false, reason: "usage_unavailable", detail: err instanceof Error ? err.name : "erreur inconnue" };
  }
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
  | { ok: false; reason: "usage_unavailable"; detail: string }
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
 * Reste une course bénigne : deux appels simultanés peuvent tous deux lire
 * `used = limit - 1` et produire une image de trop. C'est une image, borné,
 * et l'incrément lui-même ne se perd plus (upsert atomique) — à la différence
 * de la structure KV d'avant, où c'était l'incrément qui disparaissait et le
 * plafond qui cessait de borner quoi que ce soit.
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

  const usage = await readMonthlyUsage(now);
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
 * c'est ce qui fait que le compteur suit la production et non le trafic.
 *
 * Un UPSERT, en une seule instruction : l'addition est faite par SQLite, pas
 * par nous. C'est la raison d'être du passage en D1 — `used = used + ?` lu et
 * réécrit côté application perd un incrément dès que deux appels se croisent,
 * et c'est précisément ce que faisait la version KV.
 *
 * Lève si D1 refuse l'écriture — l'appelant décide quoi faire d'une image
 * déjà produite mais non comptée, et surtout le DIT dans sa réponse : une
 * perte de comptage silencieuse déplafonnerait le mois.
 */
export async function recordImagesProduced(count: number, now: Date = new Date()): Promise<void> {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error(`recordImagesProduced: count doit être un entier positif (reçu ${count})`);
  }
  const db = await getDrizzle();
  await db
    .insert(aiImageUsage)
    .values({ month_key: monthKey(now), used: count })
    .onConflictDoUpdate({
      target: aiImageUsage.month_key,
      set: {
        used: sql`${aiImageUsage.used} + excluded.used`,
        updated_at: sql`(datetime('now'))`,
      },
    });
}
