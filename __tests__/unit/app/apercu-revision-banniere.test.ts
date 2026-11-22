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
  autoriserApercu: vi.fn(),
  getRevision: vi.fn(),
  getBannerById: vi.fn(),
  getActiveBanners: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/apercu/autorisation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apercu/autorisation")>()),
  autoriserApercu: mocks.autoriserApercu,
}));
vi.mock("@/lib/db/revisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/revisions")>()),
  getRevision: mocks.getRevision,
}));
vi.mock("@/lib/db/banners", () => ({ getBannerById: mocks.getBannerById }));
vi.mock("@/lib/db/storefront/banners", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/storefront/banners")>()),
  getActiveBanners: mocks.getActiveBanners,
}));

import Page from "@/app/(storefront)/apercu/banniere/[revisionId]/page";

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

/**
 * Les enfants du fragment, cherchés PAR LEUR PROPRIÉTÉ et non par position.
 *
 * La première version indexait `children[0]` et `children[1]`. Ajouter
 * `<ApercuEntete/>` en tête a décalé les deux et fait tomber onze tests d'un
 * coup — pour une raison qui n'avait rien à voir avec ce qu'ils vérifient.
 * Chercher la propriété attendue dit ce qu'on veut et survit à l'insertion
 * d'un voisin.
 */
async function enfantPortant<T>(revisionId: string, propriete: string): Promise<T> {
  const el = await Page({ params: Promise.resolve({ revisionId }) });
  const enfants = (el as unknown as { props: { children: { props?: Record<string, unknown> }[] } })
    .props.children;
  const trouve = enfants.find((e) => e?.props && propriete in e.props);
  if (!trouve) {
    throw new Error(
      `aucun enfant ne porte « ${propriete} » (vus : ${enfants
        .map((e) => Object.keys(e?.props ?? {}).join("+") || "sans props")
        .join(", ")})`,
    );
  }
  return trouve.props![propriete] as T;
}

/** Le carrousel tel qu'il parvient au composant de la vitrine. */
async function carrouselRendu(revisionId = "rev-1") {
  return enfantPortant<Record<string, unknown>[]>(revisionId, "banners");
}

/** Les avertissements posés au-dessus du rendu. */
async function avertissementsRendus(revisionId = "rev-1") {
  return enfantPortant<{ message: string; bloquant: boolean }[]>(revisionId, "avertissements");
}

/** La bannière RÉVISÉE dans ce carrousel. */
async function banniereRendue(revisionId = "rev-1") {
  const c = await carrouselRendu(revisionId);
  return c.find((b) => b.id === 7) as Record<string, unknown>;
}

beforeEach(() => {
  mocks.autoriserApercu.mockReset().mockResolvedValue(undefined);
  mocks.getRevision.mockReset().mockResolvedValue(revision());
  mocks.getBannerById.mockReset().mockResolvedValue(BANNIERE);
  mocks.getActiveBanners.mockReset().mockResolvedValue([
    { ...BANNIERE, id: 3, display_order: 0, title: "Voisine avant", content_html: "<p>voisine</p>" },
    BANNIERE,
    { ...BANNIERE, id: 9, display_order: 2, title: "Voisine après", content_html: "<p>voisine</p>" },
  ]);
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

  it("l'autorisation est exigée AVANT toute lecture", async () => {
    mocks.autoriserApercu.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(banniereRendue()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.getRevision).not.toHaveBeenCalled();
  });
});

describe("aperçu de révision : le carrousel, pas la diapositive seule", () => {
  /**
   * Une bannière ne se juge pas hors de son voisinage : son rang, ce qui la
   * précède, ce qui la suit, les puces. La première version rendait une
   * diapositive isolée — elle répondait « ma composition est-elle bien
   * formée », pas « comment se tient-elle parmi les autres ».
   */
  it("rend les voisines, à leur place", async () => {
    const c = await carrouselRendu();
    expect(c.map((b) => b.id)).toEqual([3, 7, 9]);
    expect(c.map((b) => b.title)).toEqual(["Voisine avant", "Avant", "Voisine après"]);
    // Et seule la révisée porte le contenu proposé : les voisines sont intactes.
    expect(c.map((b) => String(b.content_html).includes("après"))).toEqual([false, true, false]);
  });

  /**
   * Le cas qui compte le plus avant un clic : un retrait montre le carrousel
   * AMPUTÉ. Voir ce qui reste est exactement la décision qu'on prend.
   */
  it("un retrait montre le carrousel sans elle", async () => {
    mocks.getRevision.mockResolvedValue(revision({ kind: "withdraw", payload: {} }));
    expect((await carrouselRendu()).map((b) => b.id)).toEqual([3, 9]);
  });

  // Une bannière dont la fenêtre serait passée disparaît aussi : c'est la
  // même lecture de « affichée » que la vitrine, pas une seconde.
  it("une fin de fenêtre passée la retire aussi", async () => {
    mocks.getRevision.mockResolvedValue(revision({ payload: { ends_at: "2020-01-01 00:00:00" } }));
    expect((await carrouselRendu()).map((b) => b.id)).toEqual([3, 9]);
  });

  // Et l'inverse : une création l'INSÈRE à son rang, là où elle n'était pas.
  it("une bannière absente du carrousel y est insérée à son rang", async () => {
    mocks.getActiveBanners.mockResolvedValue([
      { ...BANNIERE, id: 3, display_order: 0, title: "Voisine avant" },
      { ...BANNIERE, id: 9, display_order: 2, title: "Voisine après" },
    ]);
    mocks.getBannerById.mockResolvedValue({ ...BANNIERE, is_active: 0, display_order: 1 });
    mocks.getRevision.mockResolvedValue(revision({ kind: "create" }));
    expect((await carrouselRendu()).map((b) => b.id)).toEqual([3, 7, 9]);
  });
});

describe("aperçu de révision : ce qu'il DIT, et pas seulement ce qu'il montre", () => {
  /**
   * `applyRevision` refuse une révision qui n'est plus `pending`. Sans cette
   * lecture, l'écran rendait une révision REJETÉE exactement comme une
   * applicable — et l'administrateur jugeait un rendu qui ne se produira
   * jamais.
   */
  it("dit qu'une révision rejetée ne peut plus être appliquée", async () => {
    mocks.getRevision.mockResolvedValue(revision({ status: "rejected" }));
    const a = await avertissementsRendus();
    expect(a[0].message).toMatch(/rejetée/);
    expect(a[0].bloquant).toBe(true);
  });

  /**
   * Et le second refus de `applyRevision` : la cible a bougé depuis le dépôt.
   * L'aperçu superpose alors la proposition à un état qu'elle n'a jamais vu,
   * donc il montre un rendu que l'application REFUSERAIT de produire.
   */
  it("dit que la cible a bougé depuis le dépôt", async () => {
    mocks.getRevision.mockResolvedValue(revision({ base_version: "2020-01-01 00:00:00" }));
    mocks.getBannerById.mockResolvedValue({ ...BANNIERE, updated_at: "2026-10-04 12:00:00" });
    const a = await avertissementsRendus();
    expect(a.some((x) => /conflit/.test(x.message) && x.bloquant)).toBe(true);
  });

  it("ne dit rien quand la révision est en attente et la cible inchangée", async () => {
    mocks.getRevision.mockResolvedValue(revision({ base_version: "2026-10-04 12:00:00" }));
    mocks.getBannerById.mockResolvedValue({ ...BANNIERE, updated_at: "2026-10-04 12:00:00" });
    expect(await avertissementsRendus()).toEqual([]);
  });

  /**
   * LE cas qui se lisait comme un bug : la révisée sort du carrousel, et
   * `HeroBanner` rend `null` quand la liste est vide. L'écran était alors
   * entièrement muet.
   */
  it("dit POURQUOI la bannière ne s'afficherait pas, au lieu d'un écran muet", async () => {
    mocks.getRevision.mockResolvedValue(revision({ payload: { ends_at: "2020-01-01 00:00:00" } }));
    const a = await avertissementsRendus();
    expect(a.some((x) => x.message.includes("NE S'AFFICHERAIT PAS") && x.message.includes("terminée"))).toBe(true);
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

/**
 * LE CARROUSEL DOIT ÊTRE IMMOBILE, ET SUR LA BONNE DIAPOSITIVE.
 *
 * Deux captures successives de la même révision, le 2026-10-14, ont rendu
 * deux diapositives différentes : le carrousel défile toutes les cinq
 * secondes et `networkidle0` n'attend pas la fin d'une animation. Une photo
 * qui montre une AUTRE bannière que celle qu'on révise invite à conclure —
 * j'ai failli y rapporter un défaut de mise en page inexistant.
 *
 * C'est la page qui sait quelle bannière est révisée ; `HeroBanner` ne fait
 * qu'obéir. Ce test tient la moitié « page » du contrat, l'autre étant dans
 * `hero-banner-epinglage.test.ts`.
 */
describe("aperçu de révision : le carrousel est épinglé", () => {
  it("épingle le carrousel sur la bannière révisée", async () => {
    expect(await enfantPortant<number>("rev-1", "epinglerSur")).toBe(7);
  });

  /**
   * L'identifiant vient de la CIBLE de la révision, pas d'une constante : une
   * révision sur une autre bannière doit épingler cette autre bannière.
   */
  it("suit la cible de la révision", async () => {
    mocks.getRevision.mockResolvedValue(revision({ target_id: "3" }));
    mocks.getBannerById.mockResolvedValue({ ...BANNIERE, id: 3 });
    expect(await enfantPortant<number>("rev-1", "epinglerSur")).toBe(3);
  });

  /**
   * Un retrait sort la bannière du carrousel : il n'y a plus de diapositive à
   * épingler, mais l'identifiant est passé quand même et `HeroBanner` retombe
   * sur la première — immobile. Ce qui compte ici est qu'aucune branche ne
   * cesse de l'épingler, car c'est l'immobilité qui est en jeu.
   */
  it("épingle encore sur un retrait", async () => {
    mocks.getRevision.mockResolvedValue(revision({ kind: "withdraw", payload: {} }));
    expect(await enfantPortant<number>("rev-1", "epinglerSur")).toBe(7);
  });
});
