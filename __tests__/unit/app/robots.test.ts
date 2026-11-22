import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

const rules = [robots().rules].flat();
const groupFor = (ua: string) =>
  rules.find((r) => [r.userAgent].flat().includes(ua)) ?? rules.find((r) => [r.userAgent].flat().includes("*"));

describe("robots.txt", () => {
  it.each(["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"])(
    "%s (recherche IA) suit le groupe * : site ouvert, chemins privés fermés",
    (bot) => {
      const g = groupFor(bot)!;
      expect([g.userAgent].flat()).toEqual(["*"]);
      expect(g.allow).toBe("/");
      expect(g.disallow).toEqual(expect.arrayContaining(["/admin/", "/account/", "/checkout/", "/api/"]));
    },
  );

  it.each(["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"])("%s (entraînement) reste bloqué", (bot) => {
    expect(groupFor(bot)).toMatchObject({ userAgent: bot, disallow: "/" });
  });
});
