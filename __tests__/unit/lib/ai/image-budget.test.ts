import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";

/**
 * Le compteur mensuel est en D1 (voir le commentaire de tête de
 * lib/ai/image-budget.ts : le plan le voulait en KV, et KV perdait des
 * incréments). Ces tests tournent donc contre un VRAI SQLite au schéma réel —
 * un test qui lirait le texte du SQL émis ne prouverait pas l'atomicité, et
 * c'est elle qui est la raison d'être du changement.
 *
 * La fenêtre de rafale, elle, reste en KV et garde son double en mémoire.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));

import {
  MAX_GENERATIONS_PER_WINDOW,
  MONTHLY_LIMIT_ENV,
  checkImageBudget,
  monthKey,
  parseMonthlyLimit,
  readMonthlyUsage,
  recordImagesProduced,
} from "@/lib/ai/image-budget";

/** Même double que __tests__/unit/lib/rate-limit/kv-window-limit.test.ts : il
 *  refuse un expirationTtl < 60 s comme le vrai KV, pour qu'un TTL invalide
 *  fasse échouer le test et non passer silencieusement. */
function makeKV(initial: Map<string, string> = new Map()) {
  const store = new Map(initial);
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, options?: KVNamespacePutOptions) => {
      if (options?.expirationTtl !== undefined && options.expirationTtl < 60) {
        throw new Error(`KV rejects expirationTtl below 60 seconds (got ${options.expirationTtl})`);
      }
      store.set(key, value);
    }),
    _store: store,
  } as unknown as KVNamespace & {
    put: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    _store: Map<string, string>;
  };
}

const NOW = new Date("2026-09-20T12:00:00.000Z");
const KEY = "ai:images:2026-09";

let db: DatabaseSync;
let kv: ReturnType<typeof makeKV>;

/** Le compteur tel qu'il est RÉELLEMENT en base. */
function storedUsed(key = KEY): number | null {
  const row = db.prepare("SELECT used FROM ai_image_usage WHERE month_key = ?").get(key) as
    | { used: number }
    | undefined;
  return row ? Number(row.used) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  kv = makeKV();
});

describe("monthKey", () => {
  it("porte le mois UTC", () => {
    expect(monthKey(new Date("2026-09-20T12:00:00Z"))).toBe("ai:images:2026-09");
    expect(monthKey(new Date("2026-01-01T00:00:00Z"))).toBe("ai:images:2026-01");
  });

  it("deux mois différents ne partagent pas la même clé", () => {
    expect(monthKey(new Date("2026-09-30T23:59:59Z"))).not.toBe(monthKey(new Date("2026-10-01T00:00:00Z")));
  });
});

describe("parseMonthlyLimit", () => {
  it("absent ou vide : not_configured — JAMAIS illimité", () => {
    expect(parseMonthlyLimit(undefined)).toEqual({ ok: false, reason: "not_configured" });
    expect(parseMonthlyLimit(null)).toEqual({ ok: false, reason: "not_configured" });
    expect(parseMonthlyLimit("  ")).toEqual({ ok: false, reason: "not_configured" });
  });

  it("valeur illisible : distinguée de l'absence, pour que le message dise quoi corriger", () => {
    expect(parseMonthlyLimit("dix")).toEqual({ ok: false, reason: "limit_unreadable", raw: "dix" });
    expect(parseMonthlyLimit("-5")).toEqual({ ok: false, reason: "limit_unreadable", raw: "-5" });
    expect(parseMonthlyLimit("1.5")).toEqual({ ok: false, reason: "limit_unreadable", raw: "1.5" });
  });

  it("0 est une valeur VALIDE : désactiver explicitement n'est pas « pas décidé »", () => {
    expect(parseMonthlyLimit("0")).toEqual({ ok: true, limit: 0 });
  });

  it("un entier décimal est accepté, espaces compris", () => {
    expect(parseMonthlyLimit("150")).toEqual({ ok: true, limit: 150 });
    expect(parseMonthlyLimit(" 42 ")).toEqual({ ok: true, limit: 42 });
  });
});

describe("readMonthlyUsage", () => {
  it("ligne absente : 0 — c'est la première image du mois", async () => {
    expect(await readMonthlyUsage(NOW)).toEqual({ ok: true, used: 0 });
  });

  it("lit le compteur du mois en cours, pas celui d'un autre mois", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${KEY}', 7), ('ai:images:2026-08', 999)`);
    expect(await readMonthlyUsage(NOW)).toEqual({ ok: true, used: 7 });
  });

  // Le principe survit au passage de KV à D1 : une valeur corrompue n'est plus
  // représentable dans un INTEGER NOT NULL, mais une lecture IMPOSSIBLE si —
  // et dans ce cas il faut refuser, jamais repartir de zéro.
  it("lecture impossible : usage_unavailable, PAS 0", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.exec("DROP TABLE ai_image_usage");
    const r = await readMonthlyUsage(NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("usage_unavailable");
  });
});

describe("recordImagesProduced", () => {
  it("crée la ligne du mois puis l'incrémente", async () => {
    await recordImagesProduced(1, NOW);
    expect(storedUsed()).toBe(1);
    await recordImagesProduced(1, NOW);
    expect(storedUsed()).toBe(2);
  });

  it("n'écrit que le mois concerné", async () => {
    await recordImagesProduced(1, NOW);
    await recordImagesProduced(5, new Date("2026-10-02T00:00:00Z"));
    expect(storedUsed()).toBe(1);
    expect(storedUsed("ai:images:2026-10")).toBe(5);
  });

  /**
   * LA raison du passage en D1. En KV l'incrément était un
   * lire-modifier-écrire : deux appels concurrents lisaient tous deux 0 et
   * écrivaient tous deux 1 — un incrément PERDU, et un plafond qui ne bornait
   * plus rien. Ici l'addition est faite par SQLite dans une seule
   * instruction, donc deux incréments concurrents donnent deux.
   *
   * Ce test EXÉCUTE les deux incréments ; lire le texte du SQL émis ne
   * prouverait que l'intention.
   */
  it("deux incréments concurrents donnent DEUX, pas un (upsert atomique)", async () => {
    await Promise.all([recordImagesProduced(1, NOW), recordImagesProduced(1, NOW)]);
    expect(storedUsed()).toBe(2);
  });

  it("dix incréments concurrents donnent dix", async () => {
    await Promise.all(Array.from({ length: 10 }, () => recordImagesProduced(1, NOW)));
    expect(storedUsed()).toBe(10);
  });

  it("refuse un compte non positif plutôt que d'écrire un compteur faux", async () => {
    await expect(recordImagesProduced(0, NOW)).rejects.toThrow(/entier positif/);
    await expect(recordImagesProduced(-1, NOW)).rejects.toThrow(/entier positif/);
    expect(storedUsed()).toBeNull();
  });

  it("lève si l'écriture est impossible : l'appelant doit pouvoir le DIRE", async () => {
    db.exec("DROP TABLE ai_image_usage");
    await expect(recordImagesProduced(1, NOW)).rejects.toThrow();
  });
});

describe("checkImageBudget", () => {
  it("plafond absent : REFUSE, et ne consomme aucun jeton de rafale", async () => {
    const d = await checkImageBudget({ kv, limitRaw: undefined, actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "not_configured" });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("plafond illisible : REFUSE en le disant, et n'écrit rien", async () => {
    const d = await checkImageBudget({ kv, limitRaw: "beaucoup", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "limit_unreadable", raw: "beaucoup" });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("compteur illisible : REFUSE plutôt que de repartir de zéro", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.exec("DROP TABLE ai_image_usage");
    const d = await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("usage_unavailable");
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("sous le plafond : autorise et rend usage, plafond et restant", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${KEY}', 3)`);
    const d = await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: true, used: 3, limit: 10, remaining: 7 });
  });

  it("n'incrémente PAS le compteur mensuel : seule la fenêtre écrit", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${KEY}', 3)`);
    await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(storedUsed()).toBe(3);
    expect(kv.put).toHaveBeenCalledTimes(1);
    expect(kv.put.mock.calls[0][0]).toBe("ai:images:rate:admin-1");
  });

  it("plafond atteint : refuse avec usage ET plafond, sans entamer la rafale", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${KEY}', 10)`);
    const d = await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "monthly_budget_exceeded", used: 10, limit: 10 });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("plafond 0 refuse dès la première image", async () => {
    const d = await checkImageBudget({ kv, limitRaw: "0", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "monthly_budget_exceeded", used: 0, limit: 0 });
  });

  it("la fenêtre est individuelle : un second administrateur n'hérite pas du quota du premier", async () => {
    for (let i = 0; i < MAX_GENERATIONS_PER_WINDOW; i++) {
      expect((await checkImageBudget({ kv, limitRaw: "1000", actorId: "admin-1", now: NOW })).ok).toBe(true);
    }
    const blocked = await checkImageBudget({ kv, limitRaw: "1000", actorId: "admin-1", now: NOW });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited", max: MAX_GENERATIONS_PER_WINDOW, windowSeconds: 3600 });

    expect((await checkImageBudget({ kv, limitRaw: "1000", actorId: "admin-2", now: NOW })).ok).toBe(true);
  });

  it("le plafond mensuel est commun à la boutique : un autre administrateur ne le remet pas à zéro", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${KEY}', 10)`);
    expect((await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-2", now: NOW })).ok).toBe(false);
  });
});

describe("discrimination exigée par le plan", () => {
  it("avec un plafond à 1, la DEUXIÈME génération échoue", async () => {
    const first = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(first.ok).toBe(true);

    // L'image a été produite : c'est ici, et seulement ici, que le compteur bouge.
    await recordImagesProduced(1, NOW);

    const second = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(second).toEqual({ ok: false, reason: "monthly_budget_exceeded", used: 1, limit: 1 });
  });

  it("une génération en ÉCHEC ne bouge pas le compteur : un second appel passe encore", async () => {
    const first = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(first.ok).toBe(true);

    // ... puis la génération échoue : `recordImagesProduced` n'est PAS appelée.

    expect(storedUsed()).toBeNull();
    const second = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(second.ok).toBe(true);
  });

  /**
   * La conséquence concrète du défaut KV, telle que la revue l'a mesurée :
   * avec un plafond à 3 et des incréments perdus, dix images passaient. Avec
   * l'upsert atomique, le plafond tient — la quatrième est refusée.
   */
  it("avec un plafond à 3, la quatrième image est refusée même si les incréments se croisent", async () => {
    let produced = 0;
    for (let i = 0; i < 10; i++) {
      const d = await checkImageBudget({ kv, limitRaw: "3", actorId: `admin-${i}`, now: NOW });
      if (!d.ok) continue;
      await recordImagesProduced(1, NOW);
      produced++;
    }
    expect(produced).toBe(3);
    expect(storedUsed()).toBe(3);
  });
});

describe("MONTHLY_LIMIT_ENV", () => {
  it("nomme la variable d'environnement depuis une seule source", () => {
    expect(MONTHLY_LIMIT_ENV).toBe("AI_IMAGE_MONTHLY_LIMIT");
  });
});
