import { describe, expect, it, vi, beforeEach } from "vitest";

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

describe("monthKey", () => {
  it("porte le mois UTC, pour qu'un mois révolu expire tout seul", () => {
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
  it("clé absente : 0 — c'est la première image du mois", async () => {
    expect(await readMonthlyUsage(makeKV(), NOW)).toEqual({ ok: true, used: 0 });
  });

  it("valeur illisible : usage_unreadable, pas 0", async () => {
    const kv = makeKV(new Map([[KEY, "{}"]]));
    expect(await readMonthlyUsage(kv, NOW)).toEqual({ ok: false, reason: "usage_unreadable", raw: "{}" });
  });

  it("lit le compteur du mois en cours, pas celui d'un autre mois", async () => {
    const kv = makeKV(new Map([[KEY, "7"], ["ai:images:2026-08", "999"]]));
    expect(await readMonthlyUsage(kv, NOW)).toEqual({ ok: true, used: 7 });
  });
});

describe("checkImageBudget", () => {
  let kv: ReturnType<typeof makeKV>;
  beforeEach(() => {
    kv = makeKV();
  });

  it("plafond absent : REFUSE, et ne consomme aucun jeton de rafale", async () => {
    const d = await checkImageBudget({ kv, limitRaw: undefined, actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "not_configured" });
    // Le contrôle du plafond est AVANT la fenêtre : rien n'a été écrit.
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("plafond illisible : REFUSE en le disant, et n'écrit rien", async () => {
    const d = await checkImageBudget({ kv, limitRaw: "beaucoup", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "limit_unreadable", raw: "beaucoup" });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("compteur illisible : REFUSE plutôt que de repartir de zéro", async () => {
    kv = makeKV(new Map([[KEY, "n/a"]]));
    const d = await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: false, reason: "usage_unreadable", raw: "n/a" });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("sous le plafond : autorise et rend usage, plafond et restant", async () => {
    kv = makeKV(new Map([[KEY, "3"]]));
    const d = await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(d).toEqual({ ok: true, used: 3, limit: 10, remaining: 7 });
  });

  it("n'incrémente PAS le compteur mensuel : seule la fenêtre écrit", async () => {
    kv = makeKV(new Map([[KEY, "3"]]));
    await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-1", now: NOW });
    expect(kv._store.get(KEY)).toBe("3");
    expect(kv.put).toHaveBeenCalledTimes(1);
    expect(kv.put.mock.calls[0][0]).toBe("ai:images:rate:admin-1");
  });

  it("plafond atteint : refuse avec usage ET plafond, sans entamer la rafale", async () => {
    kv = makeKV(new Map([[KEY, "10"]]));
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

    const other = await checkImageBudget({ kv, limitRaw: "1000", actorId: "admin-2", now: NOW });
    expect(other.ok).toBe(true);
  });

  it("le plafond mensuel est commun à la boutique : un autre administrateur ne le remet pas à zéro", async () => {
    kv = makeKV(new Map([[KEY, "10"]]));
    expect((await checkImageBudget({ kv, limitRaw: "10", actorId: "admin-2", now: NOW })).ok).toBe(false);
  });
});

describe("recordImagesProduced", () => {
  it("incrémente le compteur du mois", async () => {
    const kv = makeKV(new Map([[KEY, "4"]]));
    expect(await recordImagesProduced(kv, 1, NOW)).toBe(5);
    expect(kv._store.get(KEY)).toBe("5");
  });

  it("part de 0 quand le mois vient de commencer", async () => {
    const kv = makeKV();
    expect(await recordImagesProduced(kv, 1, NOW)).toBe(1);
  });

  it("écrit un TTL visant la frontière de mois, pas une durée depuis l'écriture", async () => {
    const kv = makeKV();
    await recordImagesProduced(kv, 1, NOW);
    const first = (kv.put.mock.calls[0][2] as KVNamespacePutOptions).expirationTtl as number;

    // Même mois, dix jours plus tard : le TTL doit avoir DIMINUÉ d'environ dix
    // jours, puisqu'il vise un instant absolu. S'il était écrit comme une
    // durée fixe, il serait identique — et chaque incrément repousserait
    // l'expiration (le défaut corrigé dans kv-window-limit.ts).
    const kv2 = makeKV();
    await recordImagesProduced(kv2, 1, new Date("2026-09-30T12:00:00.000Z"));
    const later = (kv2.put.mock.calls[0][2] as KVNamespacePutOptions).expirationTtl as number;
    expect(first - later).toBe(10 * 24 * 3600);

    // Et il vise bien le 1er novembre (mois +2 depuis septembre).
    expect(NOW.getTime() + first * 1000).toBe(Date.UTC(2026, 10, 1));
  });

  it("refuse un compte non positif plutôt que d'écrire un compteur faux", async () => {
    const kv = makeKV();
    await expect(recordImagesProduced(kv, 0, NOW)).rejects.toThrow(/entier positif/);
    await expect(recordImagesProduced(kv, -1, NOW)).rejects.toThrow(/entier positif/);
    expect(kv.put).not.toHaveBeenCalled();
  });
});

describe("discrimination exigée par le plan", () => {
  it("avec un plafond à 1, la DEUXIÈME génération échoue", async () => {
    const kv = makeKV();
    const first = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(first.ok).toBe(true);

    // L'image a été produite : c'est ici, et seulement ici, que le compteur bouge.
    await recordImagesProduced(kv, 1, NOW);

    const second = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(second).toEqual({ ok: false, reason: "monthly_budget_exceeded", used: 1, limit: 1 });
  });

  it("une génération en ÉCHEC ne bouge pas le compteur : un second appel passe encore", async () => {
    const kv = makeKV();
    const first = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(first.ok).toBe(true);

    // ... puis la génération échoue : `recordImagesProduced` n'est PAS appelée.

    expect(kv._store.get(KEY)).toBeUndefined();
    const second = await checkImageBudget({ kv, limitRaw: "1", actorId: "admin-1", now: NOW });
    expect(second.ok).toBe(true);
  });
});

describe("MONTHLY_LIMIT_ENV", () => {
  it("nomme la variable d'environnement depuis une seule source", () => {
    expect(MONTHLY_LIMIT_ENV).toBe("AI_IMAGE_MONTHLY_LIMIT");
  });
});
