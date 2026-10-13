import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getRevision: vi.fn(),
  getEnv: vi.fn(),
  quickAction: vi.fn(),
}));

vi.mock("@/lib/db/revisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/revisions")>()),
  getRevision: mocks.getRevision,
}));
vi.mock("@/lib/cloudflare/context", () => ({ getEnv: mocks.getEnv }));

import { apercuTools } from "@/lib/mcp/tools/apercu";
import { textOf } from "@/lib/mcp/result";
import { NOM_COOKIE_CAPTURE, verifierJetonDeCapture } from "@/lib/apercu/jeton-capture";
import { sujetApercu } from "@/lib/apercu/autorisation";
import type { McpContext } from "@/lib/mcp/context";

const SECRET = "secret-de-test-pour-l-outil-d-apercu-de-revision";
const outil = apercuTools.find((t) => t.name === "apercu_revision")!;
const ctx = { user: { id: "u1", name: "Admin", role: "admin" }, clientId: "c" } as McpContext;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);

const revision = (p: Record<string, unknown> = {}) => ({
  id: "rev-1",
  target_type: "banner",
  target_id: "7",
  kind: "update",
  payload: {},
  origin: "mcp",
  actor_id: "u1",
  actor_name: "Admin",
  summary: null,
  status: "pending",
  base_version: null,
  created_at: "2026-10-13T00:00:00Z",
  resolved_at: null,
  resolved_by: null,
  ...p,
});

const appeler = (input: Record<string, unknown> = { revision_id: "rev-1" }) =>
  outil.handler(ctx, input as never);

beforeEach(() => {
  mocks.getRevision.mockReset().mockResolvedValue(revision());
  mocks.quickAction.mockReset().mockImplementation(async () => new Response(JPEG));
  mocks.getEnv.mockReset().mockResolvedValue({
    BROWSER: { quickAction: mocks.quickAction },
    BETTER_AUTH_SECRET: SECRET,
    SITE_URL: "https://netereka.ci",
  });
});

describe("apercu_revision : ce qu'il rend", () => {
  it("rend DEUX images par défaut, puis le texte", async () => {
    const res = await appeler();
    expect(res.content.map((c) => c.type)).toEqual(["image", "image", "text"]);
    for (const bloc of res.content.filter((c) => c.type === "image")) {
      expect(bloc).toMatchObject({ mimeType: "image/jpeg" });
      expect((bloc as { data: string }).data.length).toBeGreaterThan(0);
    }
  });

  // Les défauts trouvés lors de la revue des quatre bannières étaient presque
  // tous propres à UN écran : juger sur un seul rassure sur la moitié des
  // visiteurs.
  it("photographie mobile ET bureau, dans cet ordre", async () => {
    await appeler();
    const largeurs = mocks.quickAction.mock.calls.map((c) => c[1].viewport.width);
    expect(largeurs).toEqual([390, 1440]);
  });

  it("honore une demande d'un seul écran", async () => {
    const res = await appeler({ revision_id: "rev-1", ecrans: ["bureau"] });
    expect(res.content.filter((c) => c.type === "image")).toHaveLength(1);
    expect(mocks.quickAction.mock.calls[0][1].viewport.width).toBe(1440);
  });

  it("dit ce qu'il ne montre pas, là où le modèle le lira", async () => {
    const texte = JSON.parse(textOf(await appeler()));
    expect(texte.rappel).toMatch(/prix/);
    expect(texte.rappel).toMatch(/stock/);
    expect(texte.statut).toBe("pending");
    expect(texte.url_de_l_apercu).toBe("https://netereka.ci/apercu/banniere/rev-1");
  });
});

describe("apercu_revision : le laissez-passer", () => {
  const biscuitPose = () => {
    const biscuits = mocks.quickAction.mock.calls[0][1].cookies;
    return biscuits.find((b: { name: string }) => b.name === NOM_COOKIE_CAPTURE);
  };

  it("pose un jeton valide POUR CETTE révision, en cookie et jamais dans l'URL", async () => {
    await appeler();
    const biscuit = biscuitPose();
    expect(biscuit.value).toBeTruthy();
    expect(mocks.quickAction.mock.calls[0][1].url).not.toContain(biscuit.value);
    expect(mocks.quickAction.mock.calls[0][1].url).not.toContain("jeton");
    expect(
      await verifierJetonDeCapture(SECRET, sujetApercu("banniere", "rev-1"), biscuit.value),
    ).toEqual({ valide: true });
  });

  /**
   * LA PORTÉE DU COOKIE EST CE QUI EMPÊCHE LA FUITE.
   *
   * La page d'aperçu hérite du gabarit vitrine : elle demande ses images à
   * `r2.netereka.ci` et chargerait Google Tag Manager dès qu'un identifiant GA
   * serait configuré. Un en-tête serait parti avec toutes ces requêtes. Le
   * `path` du cookie, lui, ne correspond ni à `/banners/…`, ni à
   * `/cdn-cgi/image/…`, ni à `/_next/static/…` — donc le laissez-passer ne
   * part qu'avec le document de l'aperçu.
   */
  it("limite le cookie au chemin exact de l'aperçu, et à notre domaine", async () => {
    await appeler();
    const biscuit = biscuitPose();
    expect(biscuit.path).toBe("/apercu/banniere/rev-1");
    expect(biscuit.domain).toBe("netereka.ci");
  });

  /**
   * LA RÈGLE DE CORRESPONDANCE DE CHEMIN, CELLE DE LA RFC 6265.
   *
   * Un `startsWith` nu ne la décrit pas : la correspondance exige une
   * frontière `/`. C'est ce qui fait que `/apercu/banniere/rev-10` ne reçoit
   * PAS le cookie émis pour `rev-1` — alors qu'un préfixe nu dirait le
   * contraire. (La version précédente de ce test comparait des littéraux
   * avec `startsWith`, ce qui ne testait que `startsWith`.)
   */
  it("la portée du cookie suit la frontière « / », pas un simple préfixe", async () => {
    await appeler();
    const { path } = biscuitPose();
    const correspond = (cible: string) =>
      cible === path || (cible.startsWith(path) && cible[path.length] === "/");

    expect(correspond("/apercu/banniere/rev-1")).toBe(true);
    // Les requêtes que la page émet par ailleurs : aucune ne correspond.
    for (const autre of [
      "/banners/7/img.webp",
      "/cdn-cgi/image/width=640,quality=75/x",
      "/_next/static/chunks/a.js",
      "/apercu/banniere/rev-10",
      "/apercu/produit/rev-1",
      "/",
    ]) {
      expect(correspond(autre), autre).toBe(false);
    }
  });

  // La page rend du HTML d'auteur : un défaut d'assainissement lirait
  // `document.cookie`. Refermer la fuite vers les tiers par un cookie pour la
  // ré-ouvrir vers le contenu prévisualisé n'aurait aucun sens.
  it("le cookie est httpOnly et secure", async () => {
    await appeler();
    expect(biscuitPose()).toMatchObject({ httpOnly: true, secure: true });
  });

  /**
   * UN JETON PAR CAPTURE, ET CE QUE ÇA VEUT DIRE EXACTEMENT.
   *
   * Un seul jeton pour les deux écrans couplait la seconde capture à la DURÉE
   * de la première : avec `networkidle0` et un délai de 30 s, le deuxième
   * document pouvait partir à plus de 40 s d'une fenêtre de 60.
   *
   * La propriété n'est donc PAS que les deux jetons diffèrent — émis dans la
   * même milliseconde ils sont légitimement identiques, et c'est ce que ma
   * première version de ce test exigeait à tort. C'est que l'expiration de
   * chacun soit calculée à SON instant : on fait donc avancer l'horloge de
   * 30 s par capture, et l'on exige que le second jeton soit encore valide
   * alors que le premier ne l'est plus.
   */
  it("émet un laissez-passer dont l'expiration suit SA propre capture", async () => {
    const T0 = 1_760_000_000_000;
    let horloge = T0;
    vi.spyOn(Date, "now").mockImplementation(() => horloge);
    mocks.quickAction.mockImplementation(async () => {
      horloge += 30_000; // ce que coûte une navigation `networkidle0` au pire
      return new Response(JPEG);
    });

    await appeler();
    const valeurs = mocks.quickAction.mock.calls.map(
      (c) => c[1].cookies.find((b: { name: string }) => b.name === NOM_COOKIE_CAPTURE).value,
    );
    expect(valeurs).toHaveLength(2);

    const sujet = sujetApercu("banniere", "rev-1");
    // À l'instant du SECOND document (T0 + 30 s), le premier jeton est encore
    // bon — mais c'est le second qui sert, et il tient jusqu'à T0 + 90 s,
    // où le premier a expiré depuis longtemps.
    expect((await verifierJetonDeCapture(SECRET, sujet, valeurs[1], T0 + 80_000)).valide).toBe(true);
    expect((await verifierJetonDeCapture(SECRET, sujet, valeurs[0], T0 + 80_000)).valide).toBe(
      false,
    );
    vi.mocked(Date.now).mockRestore();
  });

  /**
   * LE MARQUEUR, SANS LEQUEL TOUT LE RESTE EST SILENCIEUX.
   *
   * Si le laissez-passer est refusé, la page redirige vers la connexion,
   * Browser Run suit la redirection et rend un JPEG valide — celui de la page
   * de connexion. Le modèle croirait regarder sa révision.
   */
  it("exige le marqueur de CETTE révision", async () => {
    await appeler();
    for (const appel of mocks.quickAction.mock.calls) {
      expect(appel[1].waitForSelector).toBe('[data-apercu-revision="rev-1"]');
    }
  });

  it("n'envoie rien en en-tête", async () => {
    await appeler();
    const options = mocks.quickAction.mock.calls[0][1];
    expect(options.setExtraHTTPHeaders).toBeUndefined();
  });

  it("le jeton posé ne vaut pas pour une autre révision", async () => {
    await appeler();
    const v = await verifierJetonDeCapture(
      SECRET,
      sujetApercu("banniere", "rev-2"),
      biscuitPose().value,
    );
    expect(v.valide).toBe(false);
  });
});

describe("apercu_revision : pleine page", () => {
  // Une bannière se joue au-dessus de la ligne de flottaison ; une description
  // produit est longue, et c'est elle qu'on vient juger.
  it("par défaut : écran visible pour une bannière, page entière pour un produit", async () => {
    await appeler();
    expect(mocks.quickAction.mock.calls[0][1].screenshotOptions.fullPage).toBe(false);

    mocks.quickAction.mockClear();
    mocks.getRevision.mockResolvedValue(revision({ target_type: "product" }));
    await appeler();
    expect(mocks.quickAction.mock.calls[0][1].screenshotOptions.fullPage).toBe(true);
    expect(mocks.quickAction.mock.calls[0][1].url).toContain("/apercu/produit/");

    // LE SUJET SIGNÉ, pas seulement l'URL : sans cette assertion, figer le
    // type à « banniere » laissait la suite verte et cassait silencieusement
    // toute capture de produit — qui se serait manifestée, par la grâce du
    // marqueur, en échec plutôt qu'en photo de la page de connexion.
    const biscuit = mocks.quickAction.mock.calls[0][1].cookies[0];
    expect(
      await verifierJetonDeCapture(SECRET, sujetApercu("produit", "rev-1"), biscuit.value),
    ).toEqual({ valide: true });
    expect(biscuit.path).toBe("/apercu/produit/rev-1");
  });

  it("laisse l'appelant trancher", async () => {
    await appeler({ revision_id: "rev-1", pleine_page: true });
    expect(mocks.quickAction.mock.calls[0][1].screenshotOptions.fullPage).toBe(true);
  });
});

describe("apercu_revision : ce qu'il refuse", () => {
  // L'identifiant part dans une URL ET dans un sélecteur CSS d'attribut :
  // un guillemet y casserait le sélecteur, et un sélecteur cassé ferait
  // échouer la capture pour une raison incompréhensible.
  it("un identifiant qui casserait le sélecteur ou l'URL", async () => {
    for (const mauvais of ['rev"1', "rev 1", "rev/1", "../admin", "a".repeat(65), "rev]1"]) {
      const res = await appeler({ revision_id: mauvais });
      expect(res.isError, mauvais).toBe(true);
      expect(JSON.parse(textOf(res)), mauvais).toMatchObject({ code: "validation_error" });
    }
    expect(mocks.getRevision).not.toHaveBeenCalled();
    expect(mocks.quickAction).not.toHaveBeenCalled();
  });

  it("révision inconnue", async () => {
    mocks.getRevision.mockResolvedValue(null);
    const res = await appeler({ revision_id: "fantome" });
    expect(res.isError).toBe(true);
    expect(JSON.parse(textOf(res))).toMatchObject({ code: "not_found" });
    expect(mocks.quickAction).not.toHaveBeenCalled();
  });

  it("une cible qui n'a pas d'écran d'aperçu", async () => {
    mocks.getRevision.mockResolvedValue(revision({ target_type: "categorie" }));
    const res = await appeler();
    expect(JSON.parse(textOf(res))).toMatchObject({ code: "validation_error" });
    expect(textOf(res)).toContain("categorie");
    expect(mocks.quickAction).not.toHaveBeenCalled();
  });

  // Jamais une trace au client : c'est la règle de tous les outils de ce
  // serveur, et un message d'erreur de Browser Run pourrait porter l'URL
  // interne et le jeton.
  it("un échec de Browser Run, sans laisser fuir la trace", async () => {
    mocks.quickAction.mockRejectedValue(new Error("secret interne: AAA"));
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await appeler();
    expect(res.isError).toBe(true);
    expect(textOf(res)).not.toContain("secret interne");
    expect(textOf(res)).toContain("journaux");
    journal.mockRestore();
  });

  it("une image vide, plutôt que de rendre un bloc image que le modèle décrirait", async () => {
    mocks.quickAction.mockResolvedValue(new Response(new Uint8Array()));
    const res = await appeler();
    expect(res.isError).toBe(true);
    expect(res.content.some((c) => c.type === "image")).toBe(false);
  });

  it("une forme de retour qu'on ne sait pas lire", async () => {
    mocks.quickAction.mockResolvedValue({ image: "base64..." });
    const res = await appeler();
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("Forme inattendue");
  });
});
