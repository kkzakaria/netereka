import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchProducts, getProduct, getCategories } from "../../../../../workers/whatsapp/src/tools/catalogue";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

function createMockD1() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
  };
}

function createMockCtx(mockDb: ReturnType<typeof createMockD1>): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "s",
      wa_phone: "0",
      user_id: null,
      pending_user_id: null,
      is_verified: 0,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
    },
    env: {} as ToolContext["env"],
  };
}

describe("searchProducts", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("searches products by query and returns formatted results", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "p1", name: "iPhone 15", slug: "iphone-15", base_price: 650000, stock_quantity: 5, brand: "Apple", image_url: null },
        { id: "p2", name: "iPhone 14", slug: "iphone-14", base_price: 450000, stock_quantity: 0, brand: "Apple", image_url: null },
      ],
    });

    const result = await searchProducts(createMockCtx(mockDb), { query: "iphone" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ name: "iPhone 15", price: 650000, in_stock: true });
    expect(result.data[1]).toMatchObject({ name: "iPhone 14", price: 450000, in_stock: false });
  });

  it("returns empty array when no products found", async () => {
    mockDb._statement.all.mockResolvedValueOnce({ results: [] });

    const result = await searchProducts(createMockCtx(mockDb), { query: "xyz" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });
});

describe("getProduct", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns product details with variants", async () => {
    mockDb._statement.first.mockResolvedValueOnce({
      id: "p1", name: "iPhone 15", slug: "iphone-15", base_price: 650000,
      stock_quantity: 5, brand: "Apple", short_description: "Latest iPhone",
      category_name: "Smartphones",
    });
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "v1", name: "128GB", price: 650000, stock_quantity: 3 },
        { id: "v2", name: "256GB", price: 750000, stock_quantity: 2 },
      ],
    });

    const result = await getProduct(createMockCtx(mockDb), { slug: "iphone-15" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: "iPhone 15",
      price: 650000,
      variants: [
        { id: "v1", name: "128GB", price: 650000, in_stock: true },
        { id: "v2", name: "256GB", price: 750000, in_stock: true },
      ],
    });
  });

  it("returns error when product not found", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await getProduct(createMockCtx(mockDb), { slug: "nope" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Product not found");
  });
});

describe("getCategories", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns top-level categories when no parent specified", async () => {
    mockDb._statement.all.mockResolvedValueOnce({
      results: [
        { id: "c1", name: "Smartphones", slug: "smartphones", product_count: 25 },
        { id: "c2", name: "Laptops", slug: "laptops", product_count: 15 },
      ],
    });

    const result = await getCategories(createMockCtx(mockDb), {});

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
