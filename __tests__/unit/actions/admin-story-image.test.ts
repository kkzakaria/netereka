import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

/**
 * `uploadStoryImage`, la troisième porte d'entrée d'images de l'écran
 * d'administration — et la seule des trois qui n'avait AUCUN test.
 *
 * C'est exactement ce qui l'a laissée accepter l'AVIF après que les deux
 * autres l'eurent fermé : rien ne rougissait. Même histoire que
 * `uploadProductImage` et `deleteBanner` cette semaine. Une porte sans test
 * ne se referme pas toute seule, et surtout elle ne reste pas fermée.
 */
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const e = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    e.digest = `NEXT_REDIRECT;${url}`;
    throw e;
  }),
  uploadToR2: vi.fn(),
  findFirst: vi.fn(),
  getDrizzle: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: mocks.uploadToR2, deleteFromR2: vi.fn() }));
vi.mock("@/lib/db/drizzle", () => ({ getDrizzle: mocks.getDrizzle }));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("uid123") }));

import { uploadStoryImage } from "@/actions/admin/story";

function fichier(type: string, nom = "photo.png"): FormData {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3, 4])], nom, { type }));
  return fd;
}
const cle = () => (mocks.uploadToR2.mock.calls[0] as [File, string])[1];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(mockAdminSession);
  mocks.uploadToR2.mockResolvedValue("ok");
  mocks.findFirst.mockResolvedValue({ id: "p1" });
  mocks.getDrizzle.mockResolvedValue({ query: { products: { findFirst: mocks.findFirst } } });
});

describe("uploadStoryImage : les formats que la vitrine sait rendre", () => {
  it("refuse un AVIF, et rien n'est écrit en R2", async () => {
    const r = await uploadStoryImage("p1", fichier("image/avif", "photo.avif"));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/image\/avif/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("refuse un SVG : il porte du script et ne se redimensionne pas", async () => {
    const r = await uploadStoryImage("p1", fichier("image/svg+xml", "logo.svg"));
    expect(r.success).toBe(false);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  // Le message ne doit pas attribuer la restriction au service : Cloudflare
  // lit aussi le GIF. C'est notre choix, et le dire autrement enverrait un
  // administrateur convertir pour un motif inventé.
  it("le refus dit que la restriction est la nôtre", async () => {
    const r = await uploadStoryImage("p1", fichier("image/gif", "anim.gif"));
    expect(r.error).toMatch(/nous n'acceptons que/i);
    expect(r.error).not.toMatch(/ne lit que/i);
  });

  it("accepte les trois formats retenus", async () => {
    for (const [type, nom] of [["image/jpeg", "a.jpg"], ["image/png", "a.png"], ["image/webp", "a.webp"]]) {
      mocks.uploadToR2.mockClear();
      const r = await uploadStoryImage("p1", fichier(type, nom));
      expect(r.success, `${type} refusé à tort`).toBe(true);
      expect(mocks.uploadToR2).toHaveBeenCalledTimes(1);
    }
  });
});

describe("uploadStoryImage : l'extension vient du type, jamais du nom", () => {
  it("un nom mensonger ne décide pas de la clé", async () => {
    await uploadStoryImage("p1", fichier("image/webp", "piege.png"));
    expect(cle()).toMatch(/\.webp$/);
    expect(cle()).not.toMatch(/\.png$/);
  });

  it("un nom sans extension n'empêche pas la clé", async () => {
    await uploadStoryImage("p1", fichier("image/jpeg", "sans-extension"));
    expect(cle()).toMatch(/\.jpg$/);
  });

  it("la clé reste sous le préfixe story du produit", async () => {
    await uploadStoryImage("p1", fichier("image/png"));
    expect(cle()).toBe("products/p1/story/uid123.png");
  });
});

describe("uploadStoryImage : les gardes qui précèdent", () => {
  it("redirige un non-administrateur", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(uploadStoryImage("p1", fichier("image/png"))).rejects.toThrow("NEXT_REDIRECT");
  });

  it("refuse un produit introuvable avant tout téléversement", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const r = await uploadStoryImage("p1", fichier("image/png"));
    expect(r.success).toBe(false);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("refuse au-delà de 5 Mo", async () => {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array(6 * 1024 * 1024)], "gros.png", { type: "image/png" }));
    const r = await uploadStoryImage("p1", fd);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/5 Mo/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });
});
