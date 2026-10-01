import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  applyRevision: vi.fn(),
  getRevision: vi.fn(),
  rejectRevision: vi.fn(),
  revalidatePath: vi.fn(),
  refreshHeroPreload: vi.fn(),
  revalidateProductStorefront: vi.fn(),
}));
vi.mock("@/lib/cache/revalidate-product", () => ({ revalidateProductStorefront: mocks.revalidateProductStorefront }));
vi.mock("@/lib/cloudflare/hero-preload", () => ({ refreshHeroPreload: mocks.refreshHeroPreload }));

vi.mock("@/lib/auth/guards", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/lib/db/revisions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/revisions")>("@/lib/db/revisions");
  return {
    ...actual,
    applyRevision: mocks.applyRevision,
    getRevision: mocks.getRevision,
    rejectRevision: mocks.rejectRevision,
  };
});

import { applyRevisionAction, rejectRevisionAction } from "@/actions/admin/revisions";
import { RevisionError } from "@/lib/db/revisions";

describe("applyRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshHeroPreload.mockResolvedValue(undefined);
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
  });

  // Revue de phase (fix round 4) : un échec de revalidation après une
  // application RÉUSSIE ne doit jamais se présenter comme un échec
  // d'application — sinon l'administrateur voit une erreur, réessaie, et le
  // second essai échoue en conflit (la révision est déjà `applied`) : il
  // conclut que quelque chose est cassé, alors que son contenu est en ligne
  // depuis le premier clic. `getRevision` échoue ici (utilisée par
  // `revalidateTarget` pour retrouver la cible) — le résultat doit rester un
  // succès.
  it("renvoie un succès même si la revalidation échoue après une application réussie", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 2 });
    mocks.getRevision.mockRejectedValue(new Error("D1 injoignable"));

    const result = await applyRevisionAction("rev-1");

    expect(result).toEqual({ success: true, supersededCount: 2 });
  });

  it("renvoie un succès quand la revalidation réussit normalement (chemin nominal)", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 0 });
    // Cible bannière : `revalidateTarget` ne touche jamais la base pour ce
    // cas (`revalidatePath("/")` seul), donc ce test passe sans mocker
    // `getDrizzle` — le chemin nominal, pour contraste avec le test
    // précédent où la revalidation échoue.
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "banner", target_id: "1" });

    const result = await applyRevisionAction("rev-1");

    expect(result).toEqual({ success: true, supersededCount: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  // Les sept actions d'administration des bannières re-sèment le préchargement
  // LCP du hero ; l'application d'une révision de bannière est le huitième
  // chemin d'écriture et doit le faire aussi, sinon le middleware précharge
  // l'image d'une bannière retirée ou remplacée.
  it("re-sème le préchargement du hero après l'application d'une révision de bannière", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 0 });
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "banner", target_id: "1", kind: "withdraw" });
    await applyRevisionAction("rev-1", "Soldes");
    expect(mocks.refreshHeroPreload).toHaveBeenCalledTimes(1);
  });

  it("ne touche pas au hero pour une révision de produit (publish)", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 0 });
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "product", target_id: "p1", kind: "publish" });
    await applyRevisionAction("rev-1");
    expect(mocks.refreshHeroPreload).not.toHaveBeenCalled();
  });

  it("revalide toute la vitrine du produit pour publish et withdraw, sa page seule pour une modification", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 0 });
    for (const kind of ["publish", "withdraw"]) {
      mocks.revalidateProductStorefront.mockClear();
      mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "product", target_id: "p1", kind });
      await applyRevisionAction("rev-1", "x");
      expect(mocks.revalidateProductStorefront, kind).toHaveBeenCalledWith("p1");
    }
    mocks.revalidateProductStorefront.mockClear();
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "product", target_id: "p1", kind: "update" });
    await applyRevisionAction("rev-1");
    expect(mocks.revalidateProductStorefront).not.toHaveBeenCalled();
  });

  it("transmet la saisie de confirmation à applyRevision (c'est lui qui la vérifie)", async () => {
    mocks.applyRevision.mockResolvedValue({ applied: true, superseded: 0 });
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "banner", target_id: "1", kind: "withdraw" });
    await applyRevisionAction("rev-1", "Soldes");
    expect(mocks.applyRevision).toHaveBeenCalledWith("rev-1", { id: "admin-1", name: "Admin" }, { confirmation: "Soldes" });
  });

  it("renvoie le refus d'un retrait non confirmé tel quel", async () => {
    mocks.applyRevision.mockRejectedValue(new RevisionError("validation_error", "Retrait non confirmé : saisissez exactement « Soldes »."));
    const result = await applyRevisionAction("rev-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Retrait non confirmé");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("renvoie un échec si applyRevision lève un RevisionError, sans jamais appeler getRevision", async () => {
    mocks.applyRevision.mockRejectedValue(new RevisionError("conflict", "Conflit de version."));

    const result = await applyRevisionAction("rev-1");

    expect(result).toEqual({ success: false, error: "Conflit de version." });
    expect(mocks.getRevision).not.toHaveBeenCalled();
  });

  it("renvoie une erreur générique si applyRevision lève une erreur inattendue", async () => {
    mocks.applyRevision.mockRejectedValue(new Error("boom"));

    const result = await applyRevisionAction("rev-1");

    expect(result).toEqual({ success: false, error: "Erreur lors de l'application de la révision." });
  });
});

describe("rejectRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
  });

  it("renvoie un succès quand rejectRevision réussit", async () => {
    mocks.rejectRevision.mockResolvedValue({ rejected: true });
    const result = await rejectRevisionAction("rev-1");
    expect(result).toEqual({ success: true });
  });

  it("renvoie le message du conflit tel quel quand rejectRevision lève un RevisionError", async () => {
    mocks.rejectRevision.mockRejectedValue(
      new RevisionError("conflict", "Cette révision a été résolue par quelqu'un d'autre."),
    );
    const result = await rejectRevisionAction("rev-1");
    expect(result).toEqual({ success: false, error: "Cette révision a été résolue par quelqu'un d'autre." });
  });
});
