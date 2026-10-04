import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";
import { fichierImage } from "../../helpers/octets-image";

/**
 * La porte d'administration du téléversement d'images.
 *
 * Elle n'avait AUCUN test, et c'est ce qui l'a laissée accepter n'importe
 * quelle `image/*` : le correctif du 2026-10-02 a d'abord fermé la porte MCP en
 * croyant avoir tout fermé, puis une relecture a montré qu'un administrateur
 * déposant un `.avif` depuis son ordinateur produisait exactement la même image
 * invisible (« ERROR 9520 », la vitrine servant tout par /cdn-cgi/image/).
 *
 * Remettre l'ancienne version de ce fichier laissait les 1927 tests au vert.
 */
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  uploadToR2: vi.fn(),
  deleteFromR2: vi.fn(),
  execute: vi.fn(),
  query: vi.fn().mockResolvedValue([]),
  queryFirst: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/storage/images", () => ({ uploadToR2: mocks.uploadToR2, deleteFromR2: mocks.deleteFromR2 }));
vi.mock("@/lib/db", () => ({ execute: mocks.execute, query: mocks.query, queryFirst: mocks.queryFirst }));

import { uploadProductImage } from "@/actions/admin/images";

/**
 * Un fichier déposé depuis le navigateur. Le TYPE est déclaré par le client,
 * et les OCTETS peuvent en dire autre chose — c'est ce qu'un navigateur
 * produit tout seul quand on renomme un `.avif` en `.png`, puisqu'il déduit
 * le type de l'extension.
 */
function fichier(type: string, nom = "photo.png", octetsDeType: string = type): FormData {
  const fd = new FormData();
  fd.append("file", fichierImage(type, nom, octetsDeType));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(mockAdminSession);
  mocks.query.mockResolvedValue([]);
  mocks.uploadToR2.mockResolvedValue("ok");
});

describe("uploadProductImage : les formats que la vitrine sait rendre", () => {
  it("refuse un AVIF, et rien n'est écrit en R2", async () => {
    const r = await uploadProductImage("p1", fichier("image/avif", "photo.avif"));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/image\/avif/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("refuse un SVG : il porte du script, et le redimensionneur ne le réduit pas", async () => {
    const r = await uploadProductImage("p1", fichier("image/svg+xml", "logo.svg"));
    expect(r.success).toBe(false);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  // Le message ne doit pas attribuer la restriction au service : Cloudflare lit
  // aussi le GIF, le SVG et le HEIC sur tous les plans. C'est notre choix.
  it("le refus dit que la restriction est la nôtre, sans l'inventer au service", async () => {
    const r = await uploadProductImage("p1", fichier("image/gif", "anim.gif"));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/nous n'acceptons que/i);
    expect(r.error).not.toMatch(/ne lit que/i);
  });

  it("accepte les trois formats retenus", async () => {
    for (const [type, nom] of [["image/jpeg", "a.jpg"], ["image/png", "a.png"], ["image/webp", "a.webp"]]) {
      mocks.uploadToR2.mockClear();
      const r = await uploadProductImage("p1", fichier(type, nom));
      expect(r.success, `${type} refusé à tort`).toBe(true);
      expect(mocks.uploadToR2).toHaveBeenCalledTimes(1);
    }
  });
});

/**
 * LE cas que la validation du type seul ne voyait pas. Un navigateur déduit
 * `File.type` de l'EXTENSION : un « photo.avif » renommé « photo.png »
 * arrive donc en `image/png`, honnêtement, sans que personne n'ait menti. La
 * porte disait corriger ce scénario alors qu'elle ne fermait que le cas d'un
 * client dont le nom et le type divergent.
 */
describe("uploadProductImage : ce sont les octets qui tranchent", () => {
  it("refuse un AVIF renommé .png et déclaré image/png", async () => {
    const r = await uploadProductImage("p1", fichier("image/png", "photo.png", "image/avif"));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/AVIF/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("refuse des octets qui ne sont aucune des trois images", async () => {
    const r = await uploadProductImage("p1", fichier("image/png", "photo.png", "application/pdf"));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/octets/);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it("l'extension vient des OCTETS, pas du type déclaré", async () => {
    await uploadProductImage("p1", fichier("image/png", "photo.png", "image/jpeg"));
    const [, key] = mocks.uploadToR2.mock.calls[0] as [File, string];
    expect(key).toMatch(/\.jpg$/);
  });
});

describe("uploadProductImage : l'extension vient du type, jamais du nom", () => {
  /**
   * Un `.avif` renommé `.png` aurait produit une clé `.png` portant des octets
   * AVIF — donc une image que le repli du chargeur ne reconnaît pas, puisqu'il
   * teste l'extension. Le type, lui, est validé juste avant.
   */
  it("un nom mensonger ne décide pas de la clé", async () => {
    await uploadProductImage("p1", fichier("image/webp", "piege.png"));
    const [, key] = mocks.uploadToR2.mock.calls[0] as [File, string];
    expect(key).toMatch(/\.webp$/);
    expect(key).not.toMatch(/\.png$/);
  });

  it("un nom sans extension du tout ne fait pas échouer la clé", async () => {
    await uploadProductImage("p1", fichier("image/jpeg", "sans-extension"));
    const [, key] = mocks.uploadToR2.mock.calls[0] as [File, string];
    expect(key).toMatch(/\.jpg$/);
  });

  it("la clé reste sous le préfixe du produit", async () => {
    await uploadProductImage("p1", fichier("image/png"));
    const [, key] = mocks.uploadToR2.mock.calls[0] as [File, string];
    expect(key).toMatch(/^products\/p1\/[^/]+\.png$/);
  });
});
