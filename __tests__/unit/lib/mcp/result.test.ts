import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/mcp/result";

describe("mcp result helpers", () => {
  it("ok sérialise la donnée en texte JSON", () => {
    const r = ok({ id: "p1" });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(r.content[0].text)).toEqual({ id: "p1" });
  });

  it("fail porte code, message et fieldErrors", () => {
    const r = fail("validation_error", "Nom requis", { name: ["Requis"] });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text)).toEqual({ code: "validation_error", message: "Nom requis", fieldErrors: { name: ["Requis"] } });
  });
});
