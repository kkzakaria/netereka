import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * IMMOBILISER LE CARROUSEL POUR L'APERÇU D'UNE RÉVISION.
 *
 * Ce fichier existe à cause d'une photo. `apercu_revision` a été appelé deux
 * fois de suite sur la MÊME révision, le 2026-10-14 : la première capture a
 * rendu la diapositive 2 saisie en pleine transition, bouton d'appel à
 * l'action coupé par le bord de l'écran ; la seconde, la diapositive 1,
 * parfaitement cadrée. J'allais rapporter un défaut de mise en page qui
 * n'existait pas.
 *
 * La cause : le carrousel défile tout seul toutes les cinq secondes, et
 * `networkidle0` attend la fin du RÉSEAU, pas celle d'une animation. Une photo
 * qui montre une autre bannière que celle qu'on révise est pire qu'une absence
 * de photo — elle invite à conclure.
 *
 * Ce qui est éprouvé ici n'est donc pas « la propriété existe » mais les trois
 * choses dont dépend la reproductibilité de la photo : le greffon de
 * défilement n'est pas ENREGISTRÉ, le carrousel s'ouvre sur la bonne
 * diapositive, et la vitrine, elle, n'a rien perdu.
 *
 * On inspecte les ARGUMENTS passés à Embla plutôt que le HTML rendu : au rendu
 * serveur, `useEffect` ne s'exécute pas et Embla n'applique aucune
 * transformation — le DOM ne dirait rien du comportement du carrousel.
 */
const mocks = vi.hoisted(() => ({
  useEmblaCarousel: vi.fn(() => [() => {}, undefined] as const),
  autoplay: vi.fn(() => ({ name: "autoplay" })),
}));

vi.mock("embla-carousel-react", () => ({ default: mocks.useEmblaCarousel }));
vi.mock("embla-carousel-autoplay", () => ({ default: mocks.autoplay }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: unknown }) =>
    createElement("a", { href }, children as never),
}));

import { HeroBanner } from "@/components/storefront/hero-banner";
import type { Banner } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 9, title: "iPhone Duo", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: null, link_url: "/p/x", cta_text: "Découvrir", price: null,
    bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: "<p>x</p>", created_at: "", updated_at: "", ...over,
  };
}

/** Les trois bannières affichées, dans l'ordre du carrousel. */
const CARROUSEL = [
  banner({ id: 9, title: "iPhone Duo", display_order: 0 }),
  banner({ id: 7, title: "iPhone 18 Pro Max", display_order: 1 }),
  banner({ id: 6, title: "Galaxy Z Fold 8", display_order: 2 }),
];

/** Rend le composant et rapporte ce qui a été passé à Embla. */
function optionsEmbla(props: { epinglerSur?: number | null } = {}) {
  renderToStaticMarkup(
    createElement(HeroBanner, { banners: CARROUSEL, fallbackProducts: [], ...props }),
  );
  // Le DERNIER appel, pas le premier : un test qui rend plusieurs fois
  // relirait sinon le rendu précédent, et passerait pour de mauvaises raisons.
  const [options, greffons] = mocks.useEmblaCarousel.mock.calls.at(-1) as unknown as [
    { startIndex?: number; loop?: boolean },
    unknown[] | undefined,
  ];
  return { options, greffons };
}

beforeEach(() => {
  mocks.useEmblaCarousel.mockClear();
  mocks.autoplay.mockClear();
});

describe("HeroBanner : le carrousel de la vitrine", () => {
  /**
   * LA VITRINE N'A RIEN PERDU. C'est la moitié du contrat : un correctif qui
   * figerait aussi le carrousel du site aurait éteint une animation que
   * personne n'a demandé d'éteindre.
   */
  it("défile tout seul, et s'ouvre sur la première diapositive", () => {
    const { options, greffons } = optionsEmbla();
    expect(mocks.autoplay).toHaveBeenCalledTimes(1);
    expect(mocks.autoplay).toHaveBeenCalledWith({ delay: 5000, stopOnInteraction: true });
    expect(greffons).toHaveLength(1);
    expect(options.startIndex).toBe(0);
    expect(options.loop).toBe(true);
  });
});

describe("HeroBanner : épinglé pour un aperçu", () => {
  /**
   * LE GREFFON N'EST PAS ENREGISTRÉ, et pas seulement arrêté. Un arrêt après
   * le montage (ce que fait déjà `prefers-reduced-motion`) laisse une fenêtre
   * pendant laquelle une transition a commencé — et c'est précisément une de
   * ces transitions qu'une capture a photographiée.
   */
  it("n'enregistre AUCUN greffon de défilement", () => {
    const { greffons } = optionsEmbla({ epinglerSur: 7 });
    expect(greffons).toEqual([]);
    expect(mocks.autoplay).not.toHaveBeenCalled();
  });

  it("s'ouvre sur la diapositive de la bannière demandée", () => {
    expect(optionsEmbla({ epinglerSur: 9 }).options.startIndex).toBe(0);
    expect(optionsEmbla({ epinglerSur: 7 }).options.startIndex).toBe(1);
    expect(optionsEmbla({ epinglerSur: 6 }).options.startIndex).toBe(2);
  });

  /**
   * UNE BANNIÈRE DÉSACTIVÉE N'EST PAS DANS LE CARROUSEL — c'est exactement le
   * cas de la révision de test du 2026-10-14 (bannière 4, désactivée). Il n'y
   * a alors rien à épingler, mais la photo doit RESTER reproductible : on
   * retombe sur la première diapositive, et le carrousel ne bouge toujours
   * pas. L'avertissement en haut de la page dit déjà pourquoi elle n'y est
   * pas ; ce serait l'endroit à corriger, pas ici.
   */
  it("reste immobile quand la bannière révisée n'est pas dans le carrousel", () => {
    const { options, greffons } = optionsEmbla({ epinglerSur: 4 });
    expect(options.startIndex).toBe(0);
    expect(greffons).toEqual([]);
    expect(mocks.autoplay).not.toHaveBeenCalled();
  });

  /**
   * `epinglerSur` porte un identifiant de BANNIÈRE, jamais un index. Les deux
   * coïncident par accident sur une liste courte, et un code qui confondrait
   * les deux passerait inaperçu : ici l'identifiant 6 est en position 2, donc
   * un `startIndex: epinglerSur` rendrait 6 au lieu de 2.
   */
  it("traduit un identifiant de bannière, et ne le prend pas pour un index", () => {
    expect(optionsEmbla({ epinglerSur: 6 }).options.startIndex).toBe(2);
  });
});
