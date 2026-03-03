import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  uploadToR2: vi.fn(),
  deleteFromR2: vi.fn(),
  findFirst: vi.fn(),
  dbUpdate: vi.fn(),
  dbInsert: vi.fn(),
  dbDelete: vi.fn(),
  getDrizzle: vi.fn(),
  kvPut: vi.fn(),
  kvDelete: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/storage/images", () => ({
  uploadToR2: mocks.uploadToR2,
  deleteFromR2: mocks.deleteFromR2,
}));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("mockuid8") }));
vi.mock("@/lib/db/drizzle", () => ({ getDrizzle: mocks.getDrizzle }));
vi.mock("@/lib/cloudflare/context", () => ({
  getKV: vi.fn().mockImplementation(() =>
    Promise.resolve({ put: mocks.kvPut, delete: mocks.kvDelete })
  ),
}));

import {
  createBanner,
  uploadBannerImage,
  setBannerImageUrl,
  createBannerGradient,
  deleteBannerGradient,
  reorderBanners,
} from "@/actions/admin/banners";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFile(
  name = "photo.jpg",
  type = "image/jpeg",
  size = 1024
): File {
  const buf = new Uint8Array(size);
  return new File([buf], name, { type });
}

function makeFormData(file: File): FormData {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}

/** Build a Drizzle mock that stubs query.banners.findFirst and update().set().where() */
function makeDrizzleMock(findFirstResult: unknown) {
  const whereMock = vi.fn().mockResolvedValue(undefined);
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  mocks.dbUpdate.mockReturnValue({ set: setMock });

  mocks.findFirst.mockResolvedValue(findFirstResult);

  mocks.getDrizzle.mockResolvedValue({
    query: { banners: { findFirst: mocks.findFirst } },
    update: mocks.dbUpdate,
  });

  return { whereMock, setMock };
}

// ─── createBanner ────────────────────────────────────────────────────────────

describe("createBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  /** Stub select().from() for max() and insert().values().returning() */
  function makeCreateBannerMock(
    maxOrder: number | null,
    insertResult: object[] = [{ id: 42 }]
  ) {
    const fromMock = vi.fn().mockResolvedValue([{ maxOrder }]);
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const returningMock = vi.fn().mockResolvedValue(insertResult);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    mocks.dbInsert.mockReturnValue({ values: valuesMock });

    mocks.getDrizzle.mockResolvedValue({
      select: selectMock,
      insert: mocks.dbInsert,
    });

    return { selectMock, fromMock, valuesMock, returningMock };
  }

  function makeCreateBannerFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    fd.append("title", overrides.title ?? "Bannière Test");
    fd.append("link_url", overrides.link_url ?? "/p/test-produit");
    for (const [key, value] of Object.entries(overrides)) {
      if (!fd.has(key)) fd.append(key, value);
    }
    return fd;
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  it("redirige si non admin (customer session)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(createBanner(makeCreateBannerFormData())).rejects.toThrow("NEXT_REDIRECT");
  });

  // ── Validation ───────────────────────────────────────────────────────────

  it("rejette si le titre est manquant", async () => {
    const fd = new FormData();
    fd.append("link_url", "/p/test");
    const result = await createBanner(fd);
    expect(result.success).toBe(false);
  });

  it("rejette si link_url ne commence pas par /", async () => {
    const result = await createBanner(makeCreateBannerFormData({ link_url: "http://example.com" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("chemin relatif");
  });

  // ── Calcul automatique de display_order ──────────────────────────────────

  it("table vide : max() retourne null → display_order = 0", async () => {
    const { valuesMock } = makeCreateBannerMock(null);

    const result = await createBanner(makeCreateBannerFormData());

    expect(result.success).toBe(true);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 0 })
    );
  });

  it("table non-vide : max() = 5 → display_order = 6", async () => {
    const { valuesMock } = makeCreateBannerMock(5);

    const result = await createBanner(makeCreateBannerFormData());

    expect(result.success).toBe(true);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 6 })
    );
  });

  it("la valeur display_order du formulaire est ignorée même si fournie", async () => {
    const { valuesMock } = makeCreateBannerMock(3);

    // Simule un submit manuel avec display_order=99 dans le formulaire
    const result = await createBanner(makeCreateBannerFormData({ display_order: "99" }));

    expect(result.success).toBe(true);
    // Doit utiliser max+1=4, pas 99
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 4 })
    );
  });

  // ── Erreurs DB ───────────────────────────────────────────────────────────

  it("retourne une erreur distincte si la requête max() échoue (avant l'insert)", async () => {
    const fromMock = vi.fn().mockRejectedValue(new Error("D1 select failed"));
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });
    mocks.getDrizzle.mockResolvedValue({ select: selectMock, insert: mocks.dbInsert });

    const result = await createBanner(makeCreateBannerFormData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("ordre d'affichage");
    // L'insert ne doit pas être tenté après l'échec du max()
    expect(mocks.dbInsert).not.toHaveBeenCalled();
  });

  it("retourne une erreur si l'insertion échoue (le max() a réussi)", async () => {
    const fromMock = vi.fn().mockResolvedValue([{ maxOrder: 2 }]);
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });
    mocks.getDrizzle.mockResolvedValue({
      select: selectMock,
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("D1 insert failed")),
        }),
      }),
    });

    const result = await createBanner(makeCreateBannerFormData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("création de la bannière");
  });

  it("retourne une erreur si l'insert retourne un tableau vide", async () => {
    makeCreateBannerMock(0, []);

    const result = await createBanner(makeCreateBannerFormData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Échec");
  });
});

// ─── uploadBannerImage ───────────────────────────────────────────────────────

describe("uploadBannerImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.uploadToR2.mockResolvedValue("banners/1-mockuid8.jpg");
    mocks.deleteFromR2.mockResolvedValue(undefined);
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it("redirige si non admin (customer session)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    const fd = makeFormData(makeFile());
    await expect(uploadBannerImage(1, fd)).rejects.toThrow("NEXT_REDIRECT");
  });

  // ── Validation bannerId ──────────────────────────────────────────────────

  it("rejette bannerId = 0", async () => {
    const result = await uploadBannerImage(0, makeFormData(makeFile()));
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID bannière invalide");
  });

  it("rejette bannerId négatif", async () => {
    const result = await uploadBannerImage(-5, makeFormData(makeFile()));
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID bannière invalide");
  });

  // ── Validation fichier ───────────────────────────────────────────────────

  it("rejette si pas de fichier dans formData", async () => {
    const result = await uploadBannerImage(1, new FormData());
    expect(result.success).toBe(false);
    expect(result.error).toContain("Aucun fichier sélectionné");
  });

  it("rejette un fichier de taille 0", async () => {
    const result = await uploadBannerImage(1, makeFormData(makeFile("empty.jpg", "image/jpeg", 0)));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Aucun fichier sélectionné");
  });

  it("rejette un fichier non-image (type PDF)", async () => {
    const result = await uploadBannerImage(1, makeFormData(makeFile("doc.pdf", "application/pdf")));
    expect(result.success).toBe(false);
    expect(result.error).toContain("doit être une image");
  });

  it("rejette un fichier > 5 Mo", async () => {
    const result = await uploadBannerImage(1, makeFormData(makeFile("big.jpg", "image/jpeg", 6 * 1024 * 1024)));
    expect(result.success).toBe(false);
    expect(result.error).toContain("5 Mo");
  });

  it("rejette une extension non supportée (.gif)", async () => {
    const result = await uploadBannerImage(1, makeFormData(makeFile("anim.gif", "image/gif")));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Format d'image non supporté");
  });

  // ── DB ───────────────────────────────────────────────────────────────────

  it("retourne une erreur si la bannière est introuvable", async () => {
    makeDrizzleMock(null);
    const result = await uploadBannerImage(1, makeFormData(makeFile()));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Bannière introuvable");
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  // ── Chemin nominal ───────────────────────────────────────────────────────

  it("upload réussi sans image précédente : stocke la clé R2 brute (sans /images/)", async () => {
    const { setMock } = makeDrizzleMock({ image_url: null });

    const result = await uploadBannerImage(1, makeFormData(makeFile("photo.jpg", "image/jpeg")));

    expect(result.success).toBe(true);
    // La clé stockée en DB doit être la clé R2 directe, PAS /images/banners/...
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: "banners/1-mockuid8.jpg" })
    );
    // La valeur retournée doit être la clé R2, pas un chemin local
    expect(result.url).toBe("banners/1-mockuid8.jpg");
    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
  });

  it("upload réussi avec image précédente au format clé R2 (nouveau format) : supprime l'ancienne clé", async () => {
    makeDrizzleMock({ image_url: "banners/1-oldkey.jpg" });

    const result = await uploadBannerImage(1, makeFormData(makeFile()));

    expect(result.success).toBe(true);
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1-oldkey.jpg");
  });

  it("upload réussi avec image précédente au format legacy /images/ : supprime avec clé strippée", async () => {
    makeDrizzleMock({ image_url: "/images/banners/1-legacy.png" });

    const result = await uploadBannerImage(1, makeFormData(makeFile("shot.png", "image/png")));

    expect(result.success).toBe(true);
    // deleteFromR2 doit recevoir la clé sans le préfixe /images/
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/1-legacy.png");
    // La nouvelle image doit être stockée en clé R2 directe
    expect(result.url).toBe("banners/1-mockuid8.png");
  });

  it("continue si la suppression R2 de l'ancienne image échoue", async () => {
    makeDrizzleMock({ image_url: "banners/1-old.jpg" });
    mocks.deleteFromR2.mockRejectedValue(new Error("R2 delete failed"));

    const result = await uploadBannerImage(1, makeFormData(makeFile()));

    // Le succès ne doit pas être bloqué par l'échec de suppression
    expect(result.success).toBe(true);
    expect(mocks.uploadToR2).toHaveBeenCalled();
  });

  it("retourne une erreur si l'upload R2 échoue", async () => {
    makeDrizzleMock({ image_url: null });
    mocks.uploadToR2.mockRejectedValue(new Error("R2 upload failed"));

    const result = await uploadBannerImage(1, makeFormData(makeFile()));

    expect(result.success).toBe(false);
    expect(result.error).toContain("upload de l'image");
  });

  it("construit la clé R2 avec le format banners/{bannerId}-{uid}.{ext}", async () => {
    makeDrizzleMock({ image_url: null });

    await uploadBannerImage(42, makeFormData(makeFile("img.webp", "image/webp")));

    expect(mocks.uploadToR2).toHaveBeenCalledWith(
      expect.any(File),
      "banners/42-mockuid8.webp"
    );
  });
});

// ─── setBannerImageUrl ───────────────────────────────────────────────────────

describe("setBannerImageUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.deleteFromR2.mockResolvedValue(undefined);
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(setBannerImageUrl(1, "banners/key.png")).rejects.toThrow("NEXT_REDIRECT");
  });

  // ── Validation bannerId ──────────────────────────────────────────────────

  it("rejette bannerId = 0", async () => {
    const result = await setBannerImageUrl(0, "banners/key.png");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID bannière invalide");
  });

  it("rejette bannerId négatif", async () => {
    const result = await setBannerImageUrl(-1, "banners/key.png");
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID bannière invalide");
  });

  // ── Validation imageUrl ──────────────────────────────────────────────────

  it("rejette une imageUrl vide", async () => {
    const result = await setBannerImageUrl(1, "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("URL d'image invalide");
  });

  it("rejette une imageUrl composée uniquement d'espaces", async () => {
    const result = await setBannerImageUrl(1, "   ");
    expect(result.success).toBe(false);
    expect(result.error).toContain("URL d'image invalide");
  });

  it("rejette une imageUrl avec traversal de répertoire (..)", async () => {
    const result = await setBannerImageUrl(1, "banners/../private/secret.jpg");
    expect(result.success).toBe(false);
    expect(result.error).toContain("URL d'image invalide");
  });

  it("rejette une imageUrl absolute path après normalisation", async () => {
    // /images/ sera strippé → reste /absolute qui commence par /
    const result = await setBannerImageUrl(1, "/images//absolute/path.jpg");
    expect(result.success).toBe(false);
    expect(result.error).toContain("URL d'image invalide");
  });

  it("rejette un path de traversal via le préfixe legacy", async () => {
    const result = await setBannerImageUrl(1, "/images/../etc/passwd");
    expect(result.success).toBe(false);
    expect(result.error).toContain("URL d'image invalide");
  });

  // ── DB introuvable ───────────────────────────────────────────────────────

  it("retourne une erreur si la bannière est introuvable", async () => {
    makeDrizzleMock(null);
    const result = await setBannerImageUrl(1, "banners/key.png");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Bannière introuvable");
  });

  // ── Chemin nominal — nouveau format (clé R2 directe) ─────────────────────

  it("accepte une clé R2 directe et la stocke telle quelle", async () => {
    const { setMock } = makeDrizzleMock({ image_url: null });

    const result = await setBannerImageUrl(1, "banners/new-image.png");

    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: "banners/new-image.png" })
    );
    // Retourne la clé normalisée, pas l'input brut
    expect(result.url).toBe("banners/new-image.png");
    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
  });

  // ── Chemin nominal — format legacy /images/ ──────────────────────────────

  it("normalise le préfixe legacy /images/ et stocke la clé strippée", async () => {
    const { setMock } = makeDrizzleMock({ image_url: null });

    const result = await setBannerImageUrl(1, "/images/banners/legacy-key.png");

    expect(result.success).toBe(true);
    // Doit stocker la clé sans le préfixe /images/
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: "banners/legacy-key.png" })
    );
    // Retourne la clé normalisée, PAS l'input /images/...
    expect(result.url).toBe("banners/legacy-key.png");
  });

  // ── Suppression ancienne image ───────────────────────────────────────────

  it("supprime l'ancienne image R2 (nouveau format) avant de stocker la nouvelle", async () => {
    makeDrizzleMock({ image_url: "banners/old-key.jpg" });

    await setBannerImageUrl(1, "banners/new-key.png");

    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/old-key.jpg");
  });

  it("supprime l'ancienne image R2 (format legacy /images/) avec la clé strippée", async () => {
    makeDrizzleMock({ image_url: "/images/banners/old-legacy.jpg" });

    await setBannerImageUrl(1, "banners/new-key.png");

    // deleteFromR2 doit recevoir la clé sans /images/
    expect(mocks.deleteFromR2).toHaveBeenCalledWith("banners/old-legacy.jpg");
  });

  it("n'appelle pas deleteFromR2 si aucune image précédente", async () => {
    makeDrizzleMock({ image_url: null });

    await setBannerImageUrl(1, "banners/new-key.png");

    expect(mocks.deleteFromR2).not.toHaveBeenCalled();
  });

  it("continue si la suppression R2 de l'ancienne image échoue", async () => {
    makeDrizzleMock({ image_url: "banners/old.jpg" });
    mocks.deleteFromR2.mockRejectedValue(new Error("R2 unavailable"));

    const result = await setBannerImageUrl(1, "banners/new.png");

    expect(result.success).toBe(true);
  });

  // ── Cohérence de la valeur retournée ─────────────────────────────────────

  it("retourne toujours la clé normalisée dans url (pas l'input /images/ brut)", async () => {
    makeDrizzleMock({ image_url: null });

    const result = await setBannerImageUrl(1, "/images/banners/ai-gen.png");

    expect(result.url).toBe("banners/ai-gen.png");
    expect(result.url).not.toContain("/images/");
  });

  // ── Erreur DB ─────────────────────────────────────────────────────────────

  it("retourne une erreur si la mise à jour DB échoue", async () => {
    mocks.findFirst.mockResolvedValue({ image_url: null });
    const whereMock = vi.fn().mockRejectedValue(new Error("D1 connection failed"));
    mocks.dbUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: whereMock }) });
    mocks.getDrizzle.mockResolvedValue({
      query: { banners: { findFirst: mocks.findFirst } },
      update: mocks.dbUpdate,
    });

    const result = await setBannerImageUrl(1, "banners/key.png");

    expect(result.success).toBe(false);
    expect(result.error).toContain("mise à jour de l'image");
  });
});

// ─── createBannerGradient ─────────────────────────────────────────────────────

describe("createBannerGradient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function mockInsertSuccess(overrides: Partial<{ id: number; name: string; color_from: string; color_to: string }> = {}) {
    const row = {
      id: 1,
      name: "Mon dégradé",
      color_from: "#7C3AED",
      color_to: "#EC4899",
      created_at: "2026-02-24 00:00:00",
      ...overrides,
    };
    const returningMock = vi.fn().mockResolvedValue([row]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    mocks.dbInsert.mockReturnValue({ values: valuesMock });
    mocks.getDrizzle.mockResolvedValue({ insert: mocks.dbInsert });
    return { row, valuesMock };
  }

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      createBannerGradient({ name: "Test", color_from: "#000000", color_to: "#ffffff" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette un name vide", async () => {
    const result = await createBannerGradient({ name: "", color_from: "#000000", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("nom");
  });

  it("rejette une couleur invalide (color_from)", async () => {
    const result = await createBannerGradient({ name: "Test", color_from: "not-a-color", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Couleur");
  });

  it("rejette une couleur invalide (color_to)", async () => {
    const result = await createBannerGradient({ name: "Test", color_from: "#000000", color_to: "rgb(0,0,0)" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Couleur");
  });

  it("crée le gradient et retourne l'objet créé", async () => {
    const { row, valuesMock } = mockInsertSuccess({ name: "Violet Coucher", color_from: "#7C3AED", color_to: "#EC4899" });
    const result = await createBannerGradient({
      name: "Violet Coucher",
      color_from: "#7C3AED",
      color_to: "#EC4899",
    });
    expect(result.success).toBe(true);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Violet Coucher", color_from: "#7C3AED", color_to: "#EC4899" })
    );
    expect(result.gradient).toMatchObject({
      id: row.id,
      name: row.name,
      color_from: row.color_from,
      color_to: row.color_to,
    });
  });

  it("retourne une erreur si l'insertion retourne un tableau vide", async () => {
    const returningMock = vi.fn().mockResolvedValue([]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    mocks.dbInsert.mockReturnValue({ values: valuesMock });
    mocks.getDrizzle.mockResolvedValue({ insert: mocks.dbInsert });
    const result = await createBannerGradient({ name: "Test", color_from: "#000000", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Échec");
  });

  it("retourne une erreur si l'insertion DB échoue", async () => {
    mocks.getDrizzle.mockResolvedValue({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("D1 error")),
        }),
      }),
    });
    const result = await createBannerGradient({ name: "Test", color_from: "#000000", color_to: "#ffffff" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── deleteBannerGradient ─────────────────────────────────────────────────────

describe("deleteBannerGradient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function mockDeleteSuccess(returning: object[] = [{ id: 5 }]) {
    const returningMock = vi.fn().mockResolvedValue(returning);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    mocks.dbDelete.mockReturnValue({ where: whereMock });
    mocks.getDrizzle.mockResolvedValue({ delete: mocks.dbDelete });
    return { whereMock, returningMock };
  }

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(deleteBannerGradient(1)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejette id = 0", async () => {
    const result = await deleteBannerGradient(0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID");
  });

  it("rejette id négatif", async () => {
    const result = await deleteBannerGradient(-3);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ID");
  });

  it("supprime le gradient avec succès", async () => {
    const { whereMock } = mockDeleteSuccess();
    const result = await deleteBannerGradient(5);
    expect(result.success).toBe(true);
    expect(mocks.dbDelete).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
  });

  it("retourne une erreur si le gradient est introuvable (returning vide)", async () => {
    mockDeleteSuccess([]);
    const result = await deleteBannerGradient(99);
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("retourne une erreur si la suppression DB échoue", async () => {
    mocks.dbDelete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error("D1 delete error")),
      }),
    });
    mocks.getDrizzle.mockResolvedValue({ delete: mocks.dbDelete });
    const result = await deleteBannerGradient(5);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── reorderBanners ───────────────────────────────────────────────────────────

describe("reorderBanners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  function makeReorderMock() {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.dbUpdate.mockReturnValue({ set: setMock });
    mocks.getDrizzle.mockResolvedValue({
      update: mocks.dbUpdate,
      query: { banners: { findFirst: vi.fn().mockResolvedValue(null) } },
    });
    return { whereMock, setMock };
  }

  it("redirige si non admin (customer session)", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(reorderBanners([1, 2])).rejects.toThrow("NEXT_REDIRECT");
  });

  it("tableau vide → succès sans appel DB", async () => {
    const result = await reorderBanners([]);
    expect(result.success).toBe(true);
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("valeur non-tableau (null) → succès sans appel DB", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await reorderBanners(null as any);
    expect(result.success).toBe(true);
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("met à jour display_order pour chaque ID dans le bon ordre", async () => {
    const { setMock } = makeReorderMock();
    const { revalidatePath } = await import("next/cache");
    const { getKV } = await import("@/lib/cloudflare/context");

    const result = await reorderBanners([3, 1, 2]);

    expect(result.success).toBe(true);
    expect(mocks.dbUpdate).toHaveBeenCalledTimes(3);
    expect(setMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ display_order: 0 }));
    expect(setMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ display_order: 1 }));
    expect(setMock).toHaveBeenNthCalledWith(3, expect.objectContaining({ display_order: 2 }));
    expect(revalidatePath).toHaveBeenCalledWith("/banners");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(getKV).toHaveBeenCalled();
  });

  it("passe l'updated_at avec chaque mise à jour", async () => {
    const { setMock } = makeReorderMock();

    await reorderBanners([5]);

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/) })
    );
  });

  it("appelle where() pour chaque bannière de la liste", async () => {
    const { whereMock } = makeReorderMock();

    await reorderBanners([10, 20]);

    expect(whereMock).toHaveBeenCalledTimes(2);
  });

  it("retourne une erreur si une mise à jour DB échoue", async () => {
    const whereMock = vi.fn().mockRejectedValue(new Error("D1 error"));
    mocks.dbUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: whereMock }) });
    mocks.getDrizzle.mockResolvedValue({ update: mocks.dbUpdate });
    const { revalidatePath } = await import("next/cache");

    const result = await reorderBanners([1, 2]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("ordre");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejette si un ID n'est pas un entier positif", async () => {
    const result = await reorderBanners([1, -1, 3]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalide");
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("rejette si un ID est zéro", async () => {
    const result = await reorderBanners([0, 1, 2]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalide");
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("rejette si un ID est un flottant", async () => {
    const result = await reorderBanners([1, 1.5, 2]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalide");
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("rejette si des IDs sont en double", async () => {
    const result = await reorderBanners([1, 2, 1]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("doublons");
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });

  it("rejette si le tableau dépasse 100 éléments", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    const result = await reorderBanners(ids);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Trop");
    expect(mocks.getDrizzle).not.toHaveBeenCalled();
  });
});

// ─── refreshHeroPreload (via reorderBanners) ──────────────────────────────────

describe("refreshHeroPreload: Link header format", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("génère un preload simple width=640 sans imagesrcset pour éviter le garbling CF Early Hints", async () => {
    // Set up findFirst to return a banner with an image so refreshHeroPreload
    // writes to KV rather than deleting the key.
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.dbUpdate.mockReturnValue({ set: setMock });

    mocks.findFirst.mockResolvedValue({ image_url: "banners/hero.jpg" });
    mocks.getDrizzle.mockResolvedValue({
      update: mocks.dbUpdate,
      query: {
        banners: { findFirst: mocks.findFirst },
      },
    });

    await reorderBanners([1]);

    // kvPut should have been called with the Link header value
    expect(mocks.kvPut).toHaveBeenCalledTimes(1);
    const [key, value] = mocks.kvPut.mock.calls[0] as [string, string];
    expect(key).toBe("hero:lcp:preload-url");
    expect(value).toContain("width=640");
    expect(value).toContain("rel=preload");
    expect(value).not.toContain("imagesrcset");
  });
});
