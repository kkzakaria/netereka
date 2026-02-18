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
  getCategoryTree: vi.fn(),
  uploadToR2: vi.fn(),
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
  TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
  IMAGE_MODEL: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
}));
vi.mock("@/lib/db/categories", () => ({
  getCategoryTree: mocks.getCategoryTree,
}));
vi.mock("@/lib/storage/images", () => ({
  uploadToR2: mocks.uploadToR2,
}));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("mock-nano-id") }));

import {
  generateProductText,
  generateBannerText,
  suggestCategory,
  generateBannerImage,
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
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockResponse),
    });

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
    expect(mocks.aiRun).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed JSON, returns error if both fail", async () => {
    mocks.aiRun
      .mockResolvedValueOnce({ response: "no json here" })
      .mockResolvedValueOnce({ response: "still no json" });

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Impossible de générer le texte. Réessayez."
    );
    expect(mocks.aiRun).toHaveBeenCalledTimes(2);
  });

  it("returns rate-limit error on 429", async () => {
    mocks.aiRun.mockRejectedValue(new Error("429 Too Many Requests"));

    const result = await generateProductText({ name: "iPhone 15" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Limite IA quotidienne");
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
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockResponse),
    });

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
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockResponse),
    });

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
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockResponse),
    });

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
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockResponse),
    });

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
    expect(result.data?.imageUrl).toBe("/images/banners/ai-mock-nano-id.png");
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
