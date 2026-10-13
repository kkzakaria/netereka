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
import { EN_TETE_CAPTURE, verifierJetonDeCapture } from "@/lib/apercu/jeton-capture";
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
  it("pose un jeton valide POUR CETTE révision, en en-tête et jamais dans l'URL", async () => {
    await appeler();
    const options = mocks.quickAction.mock.calls[0][1];
    const jeton = options.setExtraHTTPHeaders[EN_TETE_CAPTURE];
    expect(jeton).toBeTruthy();
    expect(options.url).not.toContain(jeton);
    expect(options.url).not.toContain("jeton");
    expect(
      await verifierJetonDeCapture(SECRET, sujetApercu("banniere", "rev-1"), jeton),
    ).toEqual({ valide: true });
  });

  it("le jeton posé ne vaut pas pour une autre révision", async () => {
    await appeler();
    const jeton = mocks.quickAction.mock.calls[0][1].setExtraHTTPHeaders[EN_TETE_CAPTURE];
    const v = await verifierJetonDeCapture(SECRET, sujetApercu("banniere", "rev-2"), jeton);
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
  });

  it("laisse l'appelant trancher", async () => {
    await appeler({ revision_id: "rev-1", pleine_page: true });
    expect(mocks.quickAction.mock.calls[0][1].screenshotOptions.fullPage).toBe(true);
  });
});

describe("apercu_revision : ce qu'il refuse", () => {
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
