import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  searchProductSpecs: vi.fn(),
  searchProductImages: vi.fn(),
  callTextModel: vi.fn(),
  getCategoryTree: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/ai/search", () => ({
  searchProductSpecs: mocks.searchProductSpecs,
  searchProductImages: mocks.searchProductImages,
}));
vi.mock("@/lib/ai", () => ({ callTextModel: mocks.callTextModel }));
vi.mock("@/lib/db/categories", () => ({ getCategoryTree: mocks.getCategoryTree }));

import { POST } from "@/app/api/admin/ai/generate-product/route";

const mockCategoryTree = [
  {
    id: "cat-1", name: "Smartphones", slug: "smartphones",
    parent_id: null, description: null, image_url: null,
    sort_order: 0, is_active: 1, created_at: "",
    children: [
      {
        id: "cat-1a", name: "iPhone", slug: "iphone",
        parent_id: "cat-1", description: null, image_url: null,
        sort_order: 0, is_active: 1, created_at: "", children: [],
      },
    ],
  },
];

const mockBlueprint = {
  name: "iPhone 16 Pro", brand: "Apple",
  description: "Un smartphone haut de gamme.",
  short_description: "Le meilleur iPhone.",
  meta_title: "iPhone 16 Pro", meta_description: "Achetez sur NETEREKA.",
  categoryId: "cat-1a",
  variants: [{ name: "128Go / Noir", stock_quantity: 5, attributes: { couleur: "Noir" } }],
};

async function collectSSEEvents(response: Response) {
  const text = await response.text();
  return text.split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/ai/generate-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCategoryTree.mockResolvedValue(mockCategoryTree);
  mocks.searchProductSpecs.mockResolvedValue("iPhone 16 Pro specs...");
  mocks.searchProductImages.mockResolvedValue(["https://cdn.example.com/img.jpg"]);
  mocks.callTextModel.mockResolvedValue(JSON.stringify(mockBlueprint));
});

describe("POST /api/admin/ai/generate-product", () => {
  it("returns 401 when not authenticated", async () => {
    mocks.requireAdmin.mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT: /"), { digest: "NEXT_REDIRECT;/" })
    );
    const res = await POST(makeRequest({ name: "iPhone 16" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    const res = await POST(makeRequest({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("streams status events then done event on success", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    const res = await POST(makeRequest({ name: "iPhone 16 Pro", brand: "Apple" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const events = await collectSSEEvents(res);
    const types = events.map((e) => e.type);
    expect(types).toContain("status");
    expect(types[types.length - 1]).toBe("done");

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent?.blueprint).toMatchObject({ name: "iPhone 16 Pro" });
    expect(doneEvent?.imageUrls).toEqual(["https://cdn.example.com/img.jpg"]);
  });

  it("streams error event when categoryId is hallucinated", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.callTextModel.mockResolvedValue(
      JSON.stringify({ ...mockBlueprint, categoryId: "fake-999" })
    );
    const res = await POST(makeRequest({ name: "iPhone 16 Pro" }));
    const events = await collectSSEEvents(res);
    const last = events[events.length - 1];
    expect(last.type).toBe("error");
    expect(last.message).toContain("catégorie");
  });

  it("streams error event on LLM 429", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.callTextModel.mockRejectedValue(new Error("OpenRouter API error 429: quota"));
    const res = await POST(makeRequest({ name: "iPhone" }));
    const events = await collectSSEEvents(res);
    const last = events[events.length - 1];
    expect(last.type).toBe("error");
    expect(String(last.message)).toContain("Limite");
  });

  it("continues without specs when search fails", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.searchProductSpecs.mockRejectedValue(new Error("network"));
    const res = await POST(makeRequest({ name: "iPhone 16 Pro" }));
    const events = await collectSSEEvents(res);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("returns empty imageUrls when image search fails", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.searchProductImages.mockRejectedValue(new Error("timeout"));
    const res = await POST(makeRequest({ name: "iPhone 16 Pro" }));
    const events = await collectSSEEvents(res);
    const done = events.find((e) => e.type === "done");
    expect(done?.imageUrls).toEqual([]);
  });
});
