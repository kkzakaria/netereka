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
  getDrizzle: vi.fn(),
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

import { uploadBannerImage, setBannerImageUrl } from "@/actions/admin/banners";

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
