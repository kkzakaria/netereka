import { describe, it, expect } from "vitest";
import { planBanner } from "@/lib/content/conversion-plan";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

function banner(over: Partial<Parameters<typeof planBanner>[0]> = {}) {
  return {
    id: 7,
    title: "OnePlus 15",
    subtitle: null,
    badge_text: null,
    price: null,
    cta_text: null,
    link_url: "/p/oneplus-15",
    content_html: null,
    ...over,
  };
}

describe("planBanner", () => {
  it("ignore une bannière déjà convertie", () => {
    expect(planBanner(banner({ content_html: "<div>x</div>" })).action).toBe("skip");
  });

  it("convertit le gabarit", () => {
    const plan = planBanner(banner({ badge_text: "Promo", price: 199000 }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.content_html).toContain("OnePlus 15");
    expect(plan.updates.content_html).toContain("Promo");
  });

  it("traite un content_html vide comme absent", () => {
    expect(planBanner(banner({ content_html: "   " })).action).toBe("convert");
  });

  // Exigence d'idempotence appliquée à content_html
  // avec le scopeId `banner-<id>` — c'est précisément l'identifiant qu'un
  // mauvais scopeId casserait silencieusement.
  it("le HTML écrit dans content_html est stable sous un second passage de sanitizeDescriptionHtml", () => {
    const plan = planBanner(banner({ badge_text: "Promo", price: 199000 }));
    if (plan.action !== "convert") throw new Error("unreachable");
    const replayed = sanitizeDescriptionHtml(plan.updates.content_html, "banner-7");
    expect(replayed).toBe(plan.updates.content_html);
  });
});
