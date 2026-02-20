import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & {
      digest: string;
    };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  aiRun: vi.fn(),
  callTextModel: vi.fn(),
  getCategoryTree: vi.fn(),
  uploadToR2: vi.fn(),
  searchProductSpecs: vi.fn(),
  searchProductImages: vi.fn(),
  execute: vi.fn(),
  query: vi.fn(),
  dbBatch: vi.fn().mockResolvedValue([]),
  dbPrepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnThis() }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi
    .fn()
    .mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/ai", () => ({
  getAI: vi.fn().mockResolvedValue({ run: mocks.aiRun }),
  TEXT_MODEL: "qwen/qwen3.5-397b-a17b",
  IMAGE_MODEL: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  callTextModel: mocks.callTextModel,
}));
vi.mock("@/lib/db/categories", () => ({
  getCategoryTree: mocks.getCategoryTree,
}));
vi.mock("@/lib/storage/images", () => ({
  uploadToR2: mocks.uploadToR2,
}));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("mock-nano-id") }));
vi.mock("@/lib/ai/search", () => ({
  searchProductSpecs: mocks.searchProductSpecs,
  searchProductImages: mocks.searchProductImages,
}));
vi.mock("@/lib/db", () => ({
  execute: mocks.execute,
  query: mocks.query,
  queryFirst: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn().mockResolvedValue({
    prepare: mocks.dbPrepare,
    batch: mocks.dbBatch,
  }),
  getKV: vi.fn(),
  getR2: vi.fn(),
  getEnv: vi.fn(),
}));

import {
  generateProductText,
  generateBannerText,
  suggestCategory,
  generateBannerImage,
  generateProductBlueprint,
  createProductFromBlueprint,
} from "@/actions/admin/ai";

const mockCategoryTree = [
  {
    id: "cat-1",
    name: "Smartphones",
    slug: "smartphones",
    parent_id: null,
    description: null,
    image_url: null,
    sort_order: 0,
    is_active: 1,
    created_at: "",
    children: [
      {
        id: "cat-1a",
        name: "iPhone",
        slug: "iphone",
        parent_id: "cat-1",
        description: null,
        image_url: null,
        sort_order: 0,
        is_active: 1,
        created_at: "",
        children: [],
      },
    ],
  },
  {
    id: "cat-2",
    name: "Ordinateurs",
    slug: "ordinateurs",
    parent_id: null,
    description: null,
    image_url: null,
    sort_order: 0,
    is_active: 1,
    created_at: "",
    children: [],
  },
];

// ─── generateProductText ────────────────────────────────────────────────────────

describe("generateProductText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.searchProductSpecs.mockResolvedValue("");
  });

  it("requires admin auth (customer session → NEXT_REDIRECT)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(generateProductText({ name: "iPhone 15" })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
  });

  it("returns error when name is empty", async () => {
    const result = await generateProductText({ name: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Le nom du produit est requis.");
  });

  it("returns generated text on valid LLM JSON response", async () => {
    const mockResponse = {
      description: "Un smartphone performant avec un design élégant.",
      shortDescription: "Smartphone premium Apple",
      metaTitle: "iPhone 15 - Achat en ligne",
      metaDescription: "Découvrez le iPhone 15 sur NETEREKA.",
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
    expect(mocks.callTextModel).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed JSON, returns error if both fail", async () => {
    mocks.callTextModel
      .mockResolvedValueOnce("no json here")
      .mockResolvedValueOnce("still no json");

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Impossible de générer le texte. Réessayez."
    );
    expect(mocks.callTextModel).toHaveBeenCalledTimes(2);
  });

  it("returns rate-limit error on 429", async () => {
    mocks.callTextModel.mockRejectedValue(new Error("OpenRouter API error 429: Too Many Requests"));

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Limite IA quotidienne");
  });

  it("passes real specs from search into the prompt user content", async () => {
    const fakeSpecs =
      "Samsung Galaxy S24 Ultra — Snapdragon 8 Gen 3, 12 Go RAM, écran 6.8 pouces";
    mocks.searchProductSpecs.mockResolvedValue(fakeSpecs);
    const mockResponse = {
      description: "Un téléphone haut de gamme avec Snapdragon 8 Gen 3.",
      shortDescription: "Samsung Galaxy S24 Ultra",
      metaTitle: "Samsung Galaxy S24 Ultra",
      metaDescription: "Achetez le Samsung Galaxy S24 Ultra sur NETEREKA.",
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await generateProductText({
      name: "Galaxy S24 Ultra",
      brand: "Samsung",
    });

    expect(result.success).toBe(true);
    // The search was called with brand + name
    expect(mocks.searchProductSpecs).toHaveBeenCalledWith("Samsung Galaxy S24 Ultra");
    // The specs must appear in the user message sent to the AI
    // callTextModel(system, user) — second argument is the user message
    const userMessage = mocks.callTextModel.mock.calls[0][1] as string;
    expect(userMessage).toContain(fakeSpecs);
    expect(userMessage).toContain("---");
  });

  it("falls back gracefully when search throws", async () => {
    mocks.searchProductSpecs.mockRejectedValue(new Error("network error"));
    const mockResponse = {
      description: "Description générique.",
      shortDescription: "Produit test",
      metaTitle: "Produit test",
      metaDescription: "Description meta.",
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await generateProductText({ name: "Produit inconnu" });
    expect(result.success).toBe(true);
    // AI was still called despite search failure
    expect(mocks.callTextModel).toHaveBeenCalledTimes(1);
    // Search was called with just the name (no brand)
    expect(mocks.searchProductSpecs).toHaveBeenCalledWith("Produit inconnu");
    // Specs section must not appear in the AI prompt
    // callTextModel(system, user) — second argument is the user message
    const userMessage = mocks.callTextModel.mock.calls[0][1] as string;
    expect(userMessage).not.toContain("Informations trouvées en ligne");
  });
});

// ─── generateBannerText ─────────────────────────────────────────────────────────

describe("generateBannerText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      generateBannerText({ productName: "iPhone 15" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns generated banner text on valid response", async () => {
    const mockResponse = {
      title: "Offre Spéciale",
      subtitle: "Découvrez nos meilleurs produits",
      ctaText: "Découvrir",
      badgeText: "Nouveau",
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await generateBannerText({ productName: "iPhone 15" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });
});

// ─── suggestCategory ────────────────────────────────────────────────────────────

describe("suggestCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.getCategoryTree.mockResolvedValue(mockCategoryTree);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      suggestCategory({ productName: "iPhone 15 Pro" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns category suggestions from existing categories", async () => {
    const mockResponse = {
      suggestions: [
        { categoryId: "cat-1a", categoryName: "iPhone", confidence: 0.95 },
        {
          categoryId: "cat-1",
          categoryName: "Smartphones",
          confidence: 0.8,
        },
        {
          categoryId: "cat-2",
          categoryName: "Ordinateurs",
          confidence: 0.1,
        },
      ],
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await suggestCategory({ productName: "iPhone 15 Pro" });
    expect(result.success).toBe(true);
    expect(result.data!.suggestions).toHaveLength(3);
    expect(result.data!.suggestions[0].categoryId).toBe("cat-1a");
  });

  it("filters out hallucinated category IDs not in the tree", async () => {
    const mockResponse = {
      suggestions: [
        {
          categoryId: "fake-id",
          categoryName: "Fake Category",
          confidence: 0.9,
        },
        { categoryId: "cat-1a", categoryName: "iPhone", confidence: 0.8 },
        {
          categoryId: "another-fake",
          categoryName: "Also Fake",
          confidence: 0.5,
        },
      ],
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await suggestCategory({
      productName: "iPhone 15 Pro Max",
    });
    expect(result.success).toBe(true);
    // Only cat-1a should remain after filtering
    expect(result.data!.suggestions).toHaveLength(1);
    expect(result.data!.suggestions[0].categoryId).toBe("cat-1a");
  });

  it("returns error when ALL suggested IDs are hallucinated", async () => {
    const mockResponse = {
      suggestions: [
        { categoryId: "fake-1", categoryName: "Fake A", confidence: 0.9 },
        { categoryId: "fake-2", categoryName: "Fake B", confidence: 0.7 },
      ],
    };
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockResponse));

    const result = await suggestCategory({ productName: "Produit inconnu" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie valide");
  });

  it("returns error when category tree is empty", async () => {
    mocks.getCategoryTree.mockResolvedValue([]);

    const result = await suggestCategory({ productName: "iPhone 15" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Aucune catégorie disponible.");
  });
});

// ─── generateBannerImage ──────────────────────────────────────────────────────

describe("generateBannerImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      generateBannerImage({ prompt: "Tech banner" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error when prompt is empty", async () => {
    const result = await generateBannerImage({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("generates image, uploads to R2, and returns URL", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mocks.aiRun.mockResolvedValue(fakeImageData);
    mocks.uploadToR2.mockResolvedValue("banners/ai-mock-nano-id.png");

    const result = await generateBannerImage({
      prompt: "Modern tech banner with smartphones",
      style: "product",
    });

    expect(result.success).toBe(true);
    expect(result.data?.imageUrl).toBe("banners/ai-mock-nano-id.png");
    expect(mocks.aiRun).toHaveBeenCalledOnce();
    expect(mocks.uploadToR2).toHaveBeenCalledOnce();
  });

  it("handles ReadableStream response from AI model", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    mocks.aiRun.mockResolvedValue(stream);
    mocks.uploadToR2.mockResolvedValue("ok");

    const result = await generateBannerImage({ prompt: "Stream banner" });
    expect(result.success).toBe(true);
    expect(mocks.uploadToR2).toHaveBeenCalledOnce();
  });

  it("returns error when AI returns empty image data", async () => {
    mocks.aiRun.mockResolvedValue(new Uint8Array(0));

    const result = await generateBannerImage({ prompt: "Empty response" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("image vide");
  });

  it("returns error when R2 upload fails", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mocks.aiRun.mockResolvedValue(fakeImageData);
    mocks.uploadToR2.mockRejectedValue(new Error("R2 upload failed"));

    const result = await generateBannerImage({ prompt: "Upload fail" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("générer l'image");
  });
});

// ─── generateProductBlueprint ─────────────────────────────────────────────────

describe("generateProductBlueprint", () => {
  const mockBlueprint = {
    name: "iPhone 16 Pro",
    brand: "Apple",
    base_price: 1049000,
    description: "Un smartphone haut de gamme.",
    short_description: "Le meilleur iPhone.",
    meta_title: "iPhone 16 Pro - Achat",
    meta_description: "Achetez l'iPhone 16 Pro sur NETEREKA.",
    categoryId: "cat-1a",
    variants: [
      {
        name: "128Go / Noir",
        stock_quantity: 5,
        attributes: { stockage: "128Go", couleur: "Noir" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.searchProductSpecs.mockResolvedValue("iPhone 16 Pro specs...");
    mocks.searchProductImages.mockResolvedValue([
      "https://example.com/img1.jpg",
    ]);
    mocks.getCategoryTree.mockResolvedValue(mockCategoryTree);
    mocks.callTextModel.mockResolvedValue(JSON.stringify(mockBlueprint));
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      generateProductBlueprint({ name: "iPhone 16 Pro" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error when name is empty", async () => {
    const result = await generateProductBlueprint({ name: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns blueprint and imageUrls on success", async () => {
    const result = await generateProductBlueprint({
      name: "iPhone 16 Pro",
      brand: "Apple",
    });
    expect(result.success).toBe(true);
    expect(result.data?.blueprint.name).toBe("iPhone 16 Pro");
    expect(result.data?.blueprint.variants).toHaveLength(1);
    expect(result.data?.imageUrls).toEqual(["https://example.com/img1.jpg"]);
  });

  it("filters out hallucinated categoryId not in category tree", async () => {
    mocks.callTextModel.mockResolvedValue(
      JSON.stringify({ ...mockBlueprint, categoryId: "cat-fake-999" })
    );
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie");
  });

  it("returns error on LLM 429", async () => {
    mocks.callTextModel.mockRejectedValue(new Error("OpenRouter API error 429: Too Many Requests"));
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Limite");
  });

  it("continues when searchProductImages rejects (catch path returns empty imageUrls)", async () => {
    mocks.searchProductImages.mockRejectedValue(new Error("network timeout"));
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(true);
    expect(result.data?.imageUrls).toEqual([]);
  });
});

// ─── createProductFromBlueprint ───────────────────────────────────────────────

describe("createProductFromBlueprint", () => {
  const blueprint = {
    name: "iPhone 16 Pro",
    brand: "Apple",
    base_price: 1049000,
    description: "Description produit.",
    short_description: "Résumé.",
    meta_title: "iPhone 16 Pro",
    meta_description: "Meta description.",
    categoryId: "cat-1a",
    variants: [
      {
        name: "128Go / Noir",
        stock_quantity: 5,
        attributes: { stockage: "128Go", couleur: "Noir" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue([]);
    mocks.uploadToR2.mockResolvedValue("products/id/img.jpg");
    mocks.dbBatch.mockResolvedValue([]);
    mocks.dbPrepare.mockReturnValue({ bind: vi.fn().mockReturnThis() });
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      createProductFromBlueprint({ blueprint, imageUrls: [] })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("creates product and variants atomically via batch, returns id", async () => {
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: [],
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe("mock-nano-id");
    // product + variant are inserted atomically via db.batch
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
    // no image INSERTs when imageUrls is empty
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("downloads and uploads images when imageUrls provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: ["https://example.com/img1.jpg"],
    });
    expect(result.success).toBe(true);
    // product + variant go via batch
    expect(mocks.dbBatch).toHaveBeenCalledTimes(1);
    expect(mocks.uploadToR2).toHaveBeenCalledTimes(1);
    // only the image INSERT goes through execute
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("skips image if download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: ["https://example.com/broken.jpg"],
    });
    expect(result.success).toBe(true);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("returns error on DB failure", async () => {
    mocks.dbBatch.mockRejectedValue(new Error("D1 write error"));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
