import { describe, it, expect } from "vitest";
import { revisionLayout } from "@/components/admin/revision-diff";

describe("revisionLayout", () => {
  it("une révision publish se montre seule — pas d'état antérieur côté client", () => {
    expect(revisionLayout("publish")).toBe("single");
  });

  it("une révision update se compare côte à côte à l'état actuel", () => {
    expect(revisionLayout("update")).toBe("side-by-side");
  });
});
