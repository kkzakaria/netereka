import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { getSearchSuggestions } from "@/actions/search";

describe("getSearchSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue([
      { slug: "iphone-15", name: "iPhone 15", brand: "Apple", base_price: 750000, image_url: null },
    ]);
  });

  it("retourne des résultats pour un terme valide", async () => {
    const results = await getSearchSuggestions("iphone");
    expect(results).toHaveLength(1);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("LIKE"), ["%iphone%", "%iphone%"]);
  });

  it("retourne un tableau vide pour un terme vide", async () => {
    const results = await getSearchSuggestions("");
    expect(results).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("retourne un tableau vide pour un terme trop court (1 char)", async () => {
    const results = await getSearchSuggestions("a");
    expect(results).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("accepte un terme de 2 caractères", async () => {
    await getSearchSuggestions("tv");
    expect(mocks.query).toHaveBeenCalled();
  });

  it("envoie le terme avec les wildcards LIKE", async () => {
    await getSearchSuggestions("samsung");
    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), ["%samsung%", "%samsung%"]);
  });
});
