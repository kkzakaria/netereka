import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La page d'aperçu d'une révision de bannière.
 *
 * Elle rend du HTML D'AUTEUR par `dangerouslySetInnerHTML` (via le vrai
 * `HeroBanner`), donc le point qui compte n'est pas qu'elle affiche quelque
 * chose : c'est QUOI elle affiche. Quatre propriétés sont éprouvées ici — le
 * ré-assainissement, sa portée, le refus de ce qui n'est pas une bannière, et
 * le fait que ce soit bien l'état APRÈS révision qui parte au composant.
 */
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getRevision: vi.fn(),
  getBannerById: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db/revisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/revisions")>()),
  getRevision: mocks.getRevision,
}));
vi.mock("@/lib/db/banners", () => ({ getBannerById: mocks.getBannerById }));

import Page from "@/app/(apercu)/apercu/banniere/[revisionId]/page";

const BANNIERE = {
  id: 7, title: "Avant", subtitle: null, badge_text: null, badge_color: "mint",
  image_url: "banners/7-a.png", link_url: "/p/x", cta_text: "Découvrir", price: null,
  bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F", content_html: "<p>avant</p>",
  display_order: 0, is_active: 1, starts_at: null, ends_at: null, created_at: "", updated_at: "",
};

const revision = (over: Record<string, unknown> = {}) => ({
  id: "rev-1", target_type: "banner", target_id: "7", kind: "update",
  payload: { content_html: "<div>après</div>" }, origin: "mcp", actor_id: "a", actor_name: "A",
  summary: null, status: "pending", base_version: null, created_at: "", resolved_at: null, resolved_by: null,
  ...over,
});

/** La bannière telle qu'elle parvient au composant de la vitrine. */
async function banniereRendue(revisionId = "rev-1") {
  const el = await Page({ params: Promise.resolve({ revisionId }) });
  const hero = (el as unknown as { props: { children: { props: { banners: unknown[] } } } }).props.children;
  return hero.props.banners[0] as Record<string, unknown>;
}

beforeEach(() => {
  mocks.requireAdmin.mockReset().mockResolvedValue(undefined);
  mocks.getRevision.mockReset().mockResolvedValue(revision());
  mocks.getBannerById.mockReset().mockResolvedValue(BANNIERE);
  mocks.notFound.mockClear();
});

describe("aperçu de révision : ce qui est rendu", () => {
  it("montre l'état APRÈS révision, pas la bannière actuelle", async () => {
    const b = await banniereRendue();
    expect(b.content_html).toContain("après");
    expect(b.content_html).not.toContain("avant");
  });

  /**
   * Défense en profondeur, exactement comme `getActiveBanners` le fait pour
   * la vitrine. Le payload est déjà assaini au dépôt, mais un aperçu qui
   * rendrait du HTML non assaini mentirait sur ce que le visiteur verra — et
   * l'exécuterait dans une page d'administration authentifiée.
   */
  it("ré-assainit le contenu avant de le rendre", async () => {
    mocks.getRevision.mockResolvedValue(revision({
      payload: { content_html: '<div onclick="vol()">x</div><script>vol()</script>' },
    }));
    const html = (await banniereRendue()).content_html as string;
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
  });

  // La portée CSS est reconstruite avec l'identifiant de la bannière : scopé
  // autrement, le <style> de l'auteur n'aurait aucun effet.
  it("assainit avec la portée de la bannière, pas une autre", async () => {
    mocks.getRevision.mockResolvedValue(revision({
      payload: { content_html: '<style>.a{color:red}</style><div class="a">x</div>' },
    }));
    expect((await banniereRendue()).content_html).toContain(".desc-banner-7 .a");
  });

  it("l'administration est exigée AVANT toute lecture", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(banniereRendue()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.getRevision).not.toHaveBeenCalled();
  });
});

describe("aperçu de révision : ce qu'il refuse", () => {
  it("404 sur une révision de produit : il n'y a pas de bannière à montrer", async () => {
    mocks.getRevision.mockResolvedValue(revision({ target_type: "product", target_id: "p1" }));
    await expect(banniereRendue()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getBannerById).not.toHaveBeenCalled();
  });

  it("404 sur une révision inconnue", async () => {
    mocks.getRevision.mockResolvedValue(null);
    await expect(banniereRendue()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // La cible a pu disparaître depuis le dépôt : un rendu vide serait plus
  // trompeur qu'un 404.
  it("404 quand la bannière a disparu depuis le dépôt", async () => {
    mocks.getBannerById.mockResolvedValue(null);
    await expect(banniereRendue()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
