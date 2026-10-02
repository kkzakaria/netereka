import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";
import type { McpContext } from "@/lib/mcp/context";

const mediaMocks = vi.hoisted(() => ({ searchImages: vi.fn() }));
vi.mock("@/lib/media/image-search", () => ({ searchImages: mediaMocks.searchImages }));

const envMocks = vi.hoisted(() => ({ getEnv: vi.fn(), getKV: vi.fn() }));
// D1 RÉEL (schéma réel) parce que le compteur mensuel y vit : avec un getDB
// qui lève, les assertions sur le compteur ne mesureraient rien.
// product-drafts et createRevision restent mockés, donc rien d'autre n'y touche.
const holder = vi.hoisted(() => ({ binding: null as unknown }));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => holder.binding,
  getEnv: envMocks.getEnv,
  getKV: envMocks.getKV,
  getR2: async () => { throw new Error("no R2 in this test"); },
}));

const draftMocks = vi.hoisted(() => ({
  getProductDraftState: vi.fn(),
  findProductImage: vi.fn(),
  countProductImages: vi.fn(),
  addImagesFromUrls: vi.fn(),
}));
vi.mock("@/lib/db/product-drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/product-drafts")>("@/lib/db/product-drafts");
  return { ...actual, ...draftMocks };
});

const revisionMocks = vi.hoisted(() => ({ createRevision: vi.fn() }));
vi.mock("@/lib/db/revisions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/revisions")>("@/lib/db/revisions");
  return { ...actual, createRevision: revisionMocks.createRevision };
});

const storageMocks = vi.hoisted(() => ({ readFromR2: vi.fn(), deleteFromR2: vi.fn(), fetchAndUploadImage: vi.fn() }));
vi.mock("@/lib/storage/images", () => ({
  readFromR2: storageMocks.readFromR2,
  deleteFromR2: storageMocks.deleteFromR2,
  uploadToR2: vi.fn(),
}));
vi.mock("@/lib/storage/fetch-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/fetch-image")>("@/lib/storage/fetch-image");
  return { ...actual, fetchAndUploadImage: storageMocks.fetchAndUploadImage };
});

// `editProductImage` est mocké (aucune clé xAI n'existe, et on ne veut pas de
// réseau) ; `encodeSourceImage` reste le VRAI : c'est lui qui refuse un type
// ou une taille inexploitable, et c'est ce que ces tests doivent voir.
const genMocks = vi.hoisted(() => ({ editProductImage: vi.fn() }));
vi.mock("@/lib/ai/image-generation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/image-generation")>("@/lib/ai/image-generation");
  return { ...actual, editProductImage: genMocks.editProductImage };
});

import { MAX_IMAGES_PER_PRODUCT } from "@/lib/db/product-drafts";
import { RevisionError } from "@/lib/db/revisions";
import { imageTools } from "@/lib/mcp/tools/images";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "client-1" };
const tool = (name: string) => imageTools.find((t) => t.name === name)!;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);
const auditFor = (tool: string) => ({ actor: { id: "admin-1", name: "Admin" }, details: { via: "mcp", tool, client_id: "client-1" } });

/** KV en mémoire, avec la contrainte de TTL du vrai KV. */
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
  } as unknown as KVNamespace & { put: ReturnType<typeof vi.fn>; _store: Map<string, string> };
}

const MONTH_KEY = `ai:images:${new Date().toISOString().slice(0, 7)}`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const GEN_INPUT = { product_id: "p1", source_image_id: "img-1", prompt: "Pose le produit sur un bureau en bois clair." };

let kv: ReturnType<typeof makeKV>;
let db: DatabaseSync;

/** Le compteur mensuel tel qu'il est RÉELLEMENT en base. */
function storedUsed(): number | null {
  const row = db.prepare("SELECT used FROM ai_image_usage WHERE month_key = ?").get(MONTH_KEY) as
    | { used: number }
    | undefined;
  return row ? Number(row.used) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  kv = makeKV();
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  envMocks.getKV.mockImplementation(async () => kv);
  envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k", AI_IMAGE_MONTHLY_LIMIT: "50" });
  // Défaut : brouillon existant, image source présente, fiche vide d'images.
  draftMocks.getProductDraftState.mockResolvedValue({ is_draft: true });
  draftMocks.findProductImage.mockResolvedValue({ id: "img-1", url: "/images/products/p1/src.png", is_primary: true });
  draftMocks.countProductImages.mockResolvedValue(0);
  storageMocks.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/png" });
  genMocks.editProductImage.mockResolvedValue({ ok: true, url: "https://xai.example/out.png" });
  draftMocks.addImagesFromUrls.mockResolvedValue({
    results: [{ url: "https://xai.example/out.png", ok: true, image_id: "new-1" }],
    primary_image_id: "img-1",
  });
  storageMocks.fetchAndUploadImage.mockResolvedValue({ ok: true, key: "products/p1/gen.png", contentType: "image/png", size: 4 });
  revisionMocks.createRevision.mockResolvedValue({ revisionId: "rev-1", status: "pending" });
});

describe("search_product_images", () => {
  it("transmet query et count à searchImages et renvoie les résultats normalisés", async () => {
    mediaMocks.searchImages.mockResolvedValue({
      ok: true,
      results: [
        { url: "https://samsung.com/a55.jpg", source_domain: "samsung.com", title: "Galaxy A55", thumbnail_url: null },
      ],
    });

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55", count: 5 });

    expect(mediaMocks.searchImages).toHaveBeenCalledWith({ query: "Galaxy A55", count: 5 });
    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.count).toBe(1);
    expect(out.results[0].url).toBe("https://samsung.com/a55.jpg");
    expect(out.results[0].source_domain).toBe("samsung.com");
    // Un résultat non vide ne porte pas de message « aucune image » :
    expect(out.message).toBeUndefined();
  });

  it("une liste vide reste un SUCCÈS et dit « aucune image trouvée »", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: true, results: [] });

    const r = await tool("search_product_images").handler(ctx, { query: "produit introuvable" });

    expect(r.isError).toBeUndefined();
    const out = parse(r);
    expect(out.count).toBe(0);
    expect(out.message).toMatch(/Aucune image trouvée/);
  });

  // Le cœur de cet outil : un échec typé ne se replie JAMAIS sur une liste
  // vide. Sans ça, une clé absente enverrait le modèle chercher ailleurs et
  // personne ne saurait qu'une clé manque.
  it("no_api_key est une ERREUR qui nomme le secret, pas une liste vide", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "no_api_key" });

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("BRAVE_SEARCH_API_KEY");
    expect(out).not.toHaveProperty("results");
  });

  it("auth_failed nomme aussi le secret (clé expirée ou révoquée)", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "auth_failed" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("BRAVE_SEARCH_API_KEY");
  });

  it("rate_limited devient limit_exceeded, pas internal_error", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "rate_limited" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("limit_exceeded");
  });

  it("invalid_input devient validation_error, pas internal_error", async () => {
    mediaMocks.searchImages.mockResolvedValue({ ok: false, reason: "invalid_input" });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out.code).toBe("validation_error");
  });

  // Chaque raison garde son identité : deux raisons distinctes ne doivent pas
  // produire le même message, sinon l'exploitant ne sait pas quoi faire.
  it("les huit raisons d'échec produisent huit messages distincts", async () => {
    const reasons = [
      "no_api_key", "invalid_input", "auth_failed", "rate_limited",
      "upstream_error", "parse_failed", "timeout", "fetch_failed",
    ] as const;
    const messages = new Set<string>();
    for (const reason of reasons) {
      mediaMocks.searchImages.mockResolvedValue({ ok: false, reason });
      const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });
      expect(r.isError).toBe(true);
      messages.add(parse(r).message);
    }
    expect(messages.size).toBe(reasons.length);
  });

  it("ne télécharge rien : aucune image n'est attachée, seules des URL sont rendues", async () => {
    mediaMocks.searchImages.mockResolvedValue({
      ok: true,
      results: [{ url: "https://x/a.jpg", source_domain: "x", title: "t", thumbnail_url: null }],
    });
    const out = parse(await tool("search_product_images").handler(ctx, { query: "Galaxy A55" }));
    expect(out).not.toHaveProperty("image_id");
    expect(out).not.toHaveProperty("applied");
    expect(out).not.toHaveProperty("revision");
  });

  it("une exception inattendue de searchImages ne laisse pas fuir de trace de pile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mediaMocks.searchImages.mockRejectedValue(new Error("boom at lib/media/image-search.ts:98"));

    const r = await tool("search_product_images").handler(ctx, { query: "Galaxy A55" });

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).not.toContain("boom");
    expect(out.message).not.toContain("image-search.ts");
  });
});

describe("generate_product_image — refus AVANT toute dépense", () => {
  it("not_found si le produit n'existe pas, sans rien générer", async () => {
    const { DraftError } = await import("@/lib/db/product-drafts");
    draftMocks.getProductDraftState.mockRejectedValue(new DraftError("not_found", "Produit introuvable"));

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(parse(r).code).toBe("not_found");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("not_found si source_image_id n'est pas une image DE CE produit", async () => {
    draftMocks.findProductImage.mockResolvedValue(null);

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    const out = parse(r);
    expect(out.code).toBe("not_found");
    expect(out.message).toContain("DÉJÀ attachée");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("limit_exceeded si la fiche est pleine : ne paie pas une image qu'on ne pourrait pas attacher", async () => {
    draftMocks.countProductImages.mockResolvedValue(MAX_IMAGES_PER_PRODUCT);

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    const out = parse(r);
    expect(out.code).toBe("limit_exceeded");
    expect(out.message).toContain(String(MAX_IMAGES_PER_PRODUCT));
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
    // Ni la fenêtre ni le compteur mensuel n'ont été touchés.
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("clé xAI absente : échec typé qui NOMME le secret, et aucun jeton de rafale consommé", async () => {
    envMocks.getEnv.mockResolvedValue({ AI_IMAGE_MONTHLY_LIMIT: "50" });

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("XAI_API_KEY");
    expect(out.message).not.toMatch(/aucune image trouvée/i);
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });

  // La décision prise là où le plan laissait le choix.
  it("plafond mensuel NON CONFIGURÉ : la génération REFUSE, elle ne passe pas en illimité", async () => {
    envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k" });

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.message).toContain("AI_IMAGE_MONTHLY_LIMIT");
    expect(out.message).toMatch(/pas.*illimité|ne vaut pas/i);
    // Dire QUOI fixer sans dire OÙ laisse l'administrateur chercher.
    expect(out.message).toContain("wrangler secret put");
    expect(out.message).toContain("wrangler.jsonc");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("plafond illisible : refuse en citant la valeur fautive", async () => {
    envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k", AI_IMAGE_MONTHLY_LIMIT: "beaucoup" });
    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));
    expect(out.message).toContain("beaucoup");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("plafond atteint : limit_exceeded portant l'usage ET le plafond dans le message", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${MONTH_KEY}', 50)`);
    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));
    expect(out.code).toBe("limit_exceeded");
    expect(out.message).toContain("50");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("objet R2 de la source absent : refuse sans générer", async () => {
    storageMocks.readFromR2.mockResolvedValue(null);
    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));
    expect(out.code).toBe("not_found");
    expect(out.message).toMatch(/absent du stockage/);
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("source d'un type inexploitable : refuse sans générer (encodeSourceImage réel)", async () => {
    storageMocks.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/gif" });
    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));
    expect(out.code).toBe("validation_error");
    expect(out.message).toContain("image/gif");
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });
});

describe("generate_product_image — la dépense et le compteur", () => {
  it("envoie la SOURCE encodée et l'invite, puis attache le résultat sur un brouillon", async () => {
    const r = await tool("generate_product_image").handler(ctx, { ...GEN_INPUT, alt: "Sur un bureau" });

    expect(r.isError).toBeUndefined();
    const sent = genMocks.editProductImage.mock.calls[0][0];
    expect(sent.prompt).toBe(GEN_INPUT.prompt);
    expect(sent.sourceImage).toBe(`data:image/png;base64,${Buffer.from(PNG).toString("base64")}`);
    // La clé R2 est dérivée de l'URL stockée (préfixe /images/ retiré).
    expect(storageMocks.readFromR2).toHaveBeenCalledWith("products/p1/src.png");

    // Brouillon : attachement direct, par addImagesFromUrls — donc par
    // fetch-image.ts, le chemin unique de téléchargement.
    expect(draftMocks.addImagesFromUrls).toHaveBeenCalledWith(
      "p1",
      [{ url: "https://xai.example/out.png", alt: "Sur un bureau" }],
      auditFor("generate_product_image"),
    );
    const out = parse(r);
    expect(out.applied).toBe("direct");
    expect(out.generated).toBe(true);
    expect(out.results[0].ok).toBe(true);
  });

  it("une image produite incrémente le compteur MENSUEL de 1", async () => {
    await tool("generate_product_image").handler(ctx, GEN_INPUT);
    expect(storedUsed()).toBe(1);
  });

  // Discrimination exigée par le plan, vue depuis l'outil.
  it("une génération EN ÉCHEC ne bouge pas le compteur mensuel", async () => {
    genMocks.editProductImage.mockResolvedValue({ ok: false, reason: "upstream_error" });

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    expect(storedUsed()).toBeNull();
    expect(draftMocks.addImagesFromUrls).not.toHaveBeenCalled();
  });

  it("avec un plafond à 1, la DEUXIÈME génération échoue", async () => {
    envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k", AI_IMAGE_MONTHLY_LIMIT: "1" });

    const first = await tool("generate_product_image").handler(ctx, GEN_INPUT);
    expect(first.isError).toBeUndefined();

    const second = await tool("generate_product_image").handler(ctx, GEN_INPUT);
    expect(second.isError).toBe(true);
    const out = parse(second);
    expect(out.code).toBe("limit_exceeded");
    expect(out.message).toContain("1");
    expect(genMocks.editProductImage).toHaveBeenCalledTimes(1);
  });

  it("avec un plafond à 1, un premier appel EN ÉCHEC laisse passer le suivant", async () => {
    envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k", AI_IMAGE_MONTHLY_LIMIT: "1" });
    genMocks.editProductImage.mockResolvedValueOnce({ ok: false, reason: "upstream_error" });

    expect((await tool("generate_product_image").handler(ctx, GEN_INPUT)).isError).toBe(true);
    expect((await tool("generate_product_image").handler(ctx, GEN_INPUT)).isError).toBeUndefined();
    expect(storedUsed()).toBe(1);
  });

  it("un compteur non incrémenté est DIT dans la réponse, pas silencieux", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // L'écriture du compteur devient impossible APRÈS que le budget a été lu.
    genMocks.editProductImage.mockImplementation(async () => {
      db.exec("CREATE TRIGGER refuse_insert BEFORE INSERT ON ai_image_usage BEGIN SELECT RAISE(ABORT, 'D1 indisponible'); END");
      return { ok: true, url: "https://xai.example/out.png" };
    });

    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));

    expect(out.generated).toBe(true);
    expect(out.budget.recorded).toBe(false);
  });

  /**
   * L'asymétrie que rien ne gardait. `addImagesFromUrls` NE LÈVE PAS sur un
   * téléchargement raté : elle rend `results: [{ ok: false, reason }]`
   * (lib/db/product-drafts.ts). Le même événement — une image produite et
   * FACTURÉE qui n'est pas attachée — se lisait donc « succès » sur un
   * brouillon (`isError` absent, `generated: true`, le `ok: false` noyé dans
   * `results`) et `internal_error` sur une fiche publiée. Les deux branches
   * doivent rendre le même verdict et le même mot.
   */
  it("brouillon : une image facturée dont le téléchargement échoue est une ERREUR, pas un succès", async () => {
    draftMocks.addImagesFromUrls.mockResolvedValue({
      results: [{ url: "https://xai.example/out.png", ok: false, reason: "too_large" }],
      primary_image_id: "img-1",
    });

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.code).toBe("internal_error");
    expect(out.message).toContain("facturée");
    expect(out.message).toContain("too_large");
    // L'image a bien été produite : le compteur a bougé, elle est payée.
    expect(storedUsed()).toBe(1);
  });

  /**
   * DOUBLE PANNE : l'écriture du compteur échoue, puis le téléchargement aussi.
   * Le libellé partagé affirmait « le compteur mensuel a bien compté cette
   * image » — une CONSTANTE, donc une affirmation qu'elle ne pouvait pas
   * connaître. L'ironie est qu'elle existait pour empêcher les deux branches de
   * diverger, et qu'en les unifiant elle a figé ce que seule une variable sait.
   *
   * Un déclencheur qui refuse l'INSERT, et lui seul : supprimer la table ferait
   * échouer la LECTURE du budget en amont, et la génération serait refusée avant
   * toute dépense — le bon comportement, mais pas le cas qu'on veut atteindre.
   * Ici la lecture passe, l'écriture lève, comme une D1 qui tombe entre les deux.
   * C'est le vrai chemin d'erreur, pas un mock.
   */
  it.each(["brouillon", "fiche publiée"] as const)(
    "%s : si le compteur n'a pas pu être incrémenté, le message le dit au lieu de l'inverse",
    async (cas) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      db.exec("CREATE TRIGGER refuse_insert BEFORE INSERT ON ai_image_usage BEGIN SELECT RAISE(ABORT, 'D1 indisponible'); END");
      if (cas === "brouillon") {
        draftMocks.addImagesFromUrls.mockResolvedValue({
          results: [{ url: "https://xai.example/out.png", ok: false, reason: "too_large" }],
          primary_image_id: null,
        });
      } else {
        draftMocks.getProductDraftState.mockResolvedValue({ is_draft: false });
        storageMocks.fetchAndUploadImage.mockResolvedValue({ ok: false, reason: "too_large" });
      }

      const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

      expect(r.isError).toBe(true);
      const out = parse(r);
      expect(out.message).toContain("facturée");
      expect(out.message).toMatch(/n'a PAS pu être incrémenté/);
      expect(out.message).not.toMatch(/a compté cette image/);
    },
  );

  it("brouillon et fiche publiée rendent le MÊME message pour le même événement", async () => {
    draftMocks.addImagesFromUrls.mockResolvedValue({
      results: [{ url: "https://xai.example/out.png", ok: false, reason: "too_large" }],
      primary_image_id: null,
    });
    const draftMsg = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT)).message;

    vi.clearAllMocks();
    db = createMigratedDb();
    holder.binding = sqliteD1(db);
    envMocks.getKV.mockImplementation(async () => kv);
    envMocks.getEnv.mockResolvedValue({ XAI_API_KEY: "xai-k", AI_IMAGE_MONTHLY_LIMIT: "50" });
    draftMocks.getProductDraftState.mockResolvedValue({ is_draft: false });
    draftMocks.findProductImage.mockResolvedValue({ id: "img-1", url: "/images/products/p1/src.png", is_primary: true });
    draftMocks.countProductImages.mockResolvedValue(0);
    storageMocks.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/png" });
    genMocks.editProductImage.mockResolvedValue({ ok: true, url: "https://xai.example/out.png" });
    storageMocks.fetchAndUploadImage.mockResolvedValue({ ok: false, reason: "too_large" });
    const publishedMsg = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT)).message;

    expect(draftMsg).toBe(publishedMsg);
  });

  // Rien ne retenait `budget.used_before` sur la bonne source : remplacer
  // `decision.used` par 0 laissait toute la suite verte.
  it("budget.used_before vient du compteur lu, pas d'une constante", async () => {
    db.exec(`INSERT INTO ai_image_usage (month_key, used) VALUES ('${MONTH_KEY}', 17)`);

    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));

    expect(out.budget).toEqual({ recorded: true, used_before: 17, limit: 50 });
    // Et le compteur a bien avancé d'une image.
    expect(storedUsed()).toBe(18);
  });

  it("compteur mensuel illisible (base indisponible) : REFUSE au lieu de repartir de zéro", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.exec("DROP TABLE ai_image_usage");

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    expect(parse(r).message).toMatch(/pas pu être lu/);
    expect(genMocks.editProductImage).not.toHaveBeenCalled();
  });

  it("le refus de xAI (4xx) remonte son détail au modèle pour qu'il corrige son invite", async () => {
    genMocks.editProductImage.mockResolvedValue({ ok: false, reason: "rejected", detail: "prompt was moderated" });
    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));
    expect(out.code).toBe("validation_error");
    expect(out.message).toContain("prompt was moderated");
  });

  it("les dix raisons d'échec de génération produisent dix messages distincts", async () => {
    const reasons = [
      "no_api_key", "auth_failed", "rate_limited", "rejected", "upstream_error",
      "parse_failed", "no_image", "b64_not_supported", "timeout", "fetch_failed",
    ] as const;
    const messages = new Set<string>();
    for (const reason of reasons) {
      genMocks.editProductImage.mockResolvedValue({ ok: false, reason });
      const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);
      expect(r.isError).toBe(true);
      messages.add(parse(r).message);
    }
    expect(messages.size).toBe(reasons.length);
  });
});

describe("generate_product_image — routage brouillon / fiche publiée", () => {
  beforeEach(() => {
    draftMocks.getProductDraftState.mockResolvedValue({ is_draft: false });
  });

  it("fiche publiée : téléverse le résultat puis dépose une révision add_images, sans attacher", async () => {
    const r = await tool("generate_product_image").handler(ctx, { ...GEN_INPUT, alt: "Visuel composé" });

    expect(storageMocks.fetchAndUploadImage).toHaveBeenCalledWith("p1", "https://xai.example/out.png");
    expect(revisionMocks.createRevision).toHaveBeenCalledWith(expect.objectContaining({
      target: "product",
      targetId: "p1",
      kind: "add_images",
      payload: { images: [{ key: "products/p1/gen.png", alt: "Visuel composé" }] },
      origin: "mcp",
    }));
    // La révision ne porte JAMAIS l'URL de xAI, seulement la clé déjà en place.
    const payload = revisionMocks.createRevision.mock.calls[0][0].payload as { images: { key: string }[] };
    expect(JSON.stringify(payload)).not.toContain("xai.example");

    expect(draftMocks.addImagesFromUrls).not.toHaveBeenCalled();
    const out = parse(r);
    expect(out.applied).toBe("revision");
    expect(out.revision).toEqual({ id: "rev-1", status: "pending" });
    expect(out.message).toContain("/revisions/rev-1");
  });

  it("téléchargement du résultat en échec : le dit, et ne dépose aucune révision", async () => {
    storageMocks.fetchAndUploadImage.mockResolvedValue({ ok: false, reason: "too_large" });

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(r.isError).toBe(true);
    const out = parse(r);
    expect(out.message).toContain("too_large");
    expect(out.message).toMatch(/facturée/);
    expect(revisionMocks.createRevision).not.toHaveBeenCalled();
    // L'image a bien été produite : le compteur a bougé, elle est payée.
    expect(storedUsed()).toBe(1);
  });

  it("dépôt de révision en échec : nettoie l'objet R2 qui n'aurait jamais été référencé", async () => {
    revisionMocks.createRevision.mockRejectedValue(new RevisionError("conflict", "Révision concurrente"));

    const r = await tool("generate_product_image").handler(ctx, GEN_INPUT);

    expect(parse(r).code).toBe("conflict");
    expect(storageMocks.deleteFromR2).toHaveBeenCalledWith("products/p1/gen.png");
  });

  // Ce test a trouvé un vrai défaut : le nettoyage s'écrivait
  // `deleteFromR2(key).catch(...)`, et un échec SYNCHRONE du nettoyage
  // (binding R2 absent) remplaçait l'erreur d'origine par une TypeError —
  // l'administrateur lisait « erreur interne » au lieu du conflit de révision.
  it("un nettoyage R2 en échec ne masque pas la cause réelle", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    revisionMocks.createRevision.mockRejectedValue(new RevisionError("conflict", "Révision concurrente"));
    storageMocks.deleteFromR2.mockRejectedValue(new Error("R2 indisponible"));

    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));

    expect(out.code).toBe("conflict");
    expect(out.message).toContain("Révision concurrente");
  });

  it("une erreur inattendue ne laisse pas fuir de trace de pile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    revisionMocks.createRevision.mockRejectedValue(new Error("boom at lib/db/revisions.ts:412"));

    const out = parse(await tool("generate_product_image").handler(ctx, GEN_INPUT));

    expect(out.code).toBe("internal_error");
    expect(out.message).not.toContain("boom");
    expect(out.message).not.toContain("revisions.ts");
  });
});
