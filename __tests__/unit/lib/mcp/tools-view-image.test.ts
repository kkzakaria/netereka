import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpContext } from "@/lib/mcp/context";
import { textOf } from "@/lib/mcp/result";

/**
 * `view_image` : le seul outil qui MONTRE une image au modèle.
 *
 * Il existe parce qu'un assistant, composant une bannière le 2026-10-02, a
 * dit quatre fois ne pas pouvoir juger les couleurs : tous les autres outils
 * ne rendent que des URL et des clés, et aucune description ne remplace le
 * fait de regarder. Ce que ce fichier vérifie avant tout, c'est que l'image
 * arrive VRAIMENT dans un bloc que le client affiche — un JSON qui contient
 * du base64 ne se voit pas.
 */
const r2 = vi.hoisted(() => ({ readFromR2: vi.fn(), deleteFromR2: vi.fn(), uploadToR2: vi.fn() }));
const net = vi.hoisted(() => ({ fetchImageBytes: vi.fn() }));

vi.mock("@/lib/storage/images", () => ({
  readFromR2: r2.readFromR2, deleteFromR2: r2.deleteFromR2, uploadToR2: r2.uploadToR2,
}));
vi.mock("@/lib/storage/fetch-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/fetch-image")>()),
  fetchImageBytes: net.fetchImageBytes,
}));

import { imageTools } from "@/lib/mcp/tools/images";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin", role: "admin" }, clientId: "c" };
const tool = imageTools.find((t) => t.name === "view_image")!;
const voir = (image: string) => tool.handler(ctx, { image } as never);

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  net.fetchImageBytes.mockReset();
  r2.readFromR2.mockReset();
});

describe("view_image : l'image arrive dans un bloc que le client affiche", () => {
  it("rend un bloc image AVANT le texte, en base64, avec son type", async () => {
    r2.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/png" });

    const r = await voir("banners/7-abc.png");

    // Le bloc image d'abord : plusieurs clients n'affichent que le premier.
    expect(r.content[0]).toEqual({ type: "image", data: btoa("\x89PNG\r\n\x1a\n"), mimeType: "image/png" });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(textOf(r))).toMatchObject({
      source: "banners/7-abc.png", content_type: "image/png", size_bytes: 8,
    });
  });

  it("une URL http(s) passe par le téléchargement gardé, sans rien stocker", async () => {
    net.fetchImageBytes.mockResolvedValue({ ok: true, bytes: PNG, contentType: "image/webp", size: 8 });

    const r = await voir("https://images.example.test/a.webp");

    expect(net.fetchImageBytes).toHaveBeenCalledWith("https://images.example.test/a.webp");
    expect(r.content[0]).toMatchObject({ type: "image", mimeType: "image/webp" });
    // Regarder ne fait entrer aucune image dans la boutique.
    expect(r2.uploadToR2).not.toHaveBeenCalled();
  });

  // Une ligne héritée porte `/images/<clé>` : la même image sous une autre
  // écriture, pas une forme fautive.
  it("accepte une clé héritée /images/ et lit la vraie clé", async () => {
    r2.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/png" });
    await voir("/images/banners/7-abc.png");
    expect(r2.readFromR2).toHaveBeenCalledWith("banners/7-abc.png");
  });
});

describe("view_image : ce qu'il refuse", () => {
  /**
   * Une chaîne qui n'est ni une URL ni une clé partirait sinon chercher un
   * objet absent et reviendrait « introuvable » — ce qui n'apprend pas que
   * c'est la FORME qui est fautive, et renverrait le modèle chercher une
   * image qui existe pourtant.
   */
  it.each([["pas une url"], ["../../secrets/cle.png"], ["autre/dossier/x.png"], ["products//x.png"]])(
    "« %s » n'est ni une URL ni une clé, et le refus le dit",
    async (entree) => {
      const r = await voir(entree);
      expect(r.isError).toBe(true);
      const out = JSON.parse(textOf(r));
      expect(out.code).toBe("validation_error");
      expect(out.message).toMatch(/URL http\(s\)[\s\S]+clé de stockage/);
      expect(r2.readFromR2).not.toHaveBeenCalled();
    },
  );

  it("une clé bien formée mais absente du stockage : not_found, pas une erreur de forme", async () => {
    r2.readFromR2.mockResolvedValue(null);
    const out = JSON.parse(textOf(await voir("products/p1/absente.png")));
    expect(out.code).toBe("not_found");
    expect(out.message).toContain("products/p1/absente.png");
  });

  it("un objet stocké qui n'est pas une image que l'on sait montrer", async () => {
    r2.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/avif" });
    const out = JSON.parse(textOf(await voir("products/p1/x.avif")));
    expect(out.code).toBe("validation_error");
    expect(out.message).toContain("image/avif");
  });

  /**
   * Le corps MCP transporte l'image en base64, soit 4/3 de sa taille. Les
   * chemins d'écriture plafonnent à 5 Mo, donc un objet stocké peut dépasser
   * ce que l'autre bout accepte : mieux vaut un refus qui DIT la taille
   * qu'un corps rejeté sans explication.
   */
  it("une image trop lourde est refusée en disant son poids, et reste utilisable ailleurs", async () => {
    r2.readFromR2.mockResolvedValue({ bytes: new Uint8Array(4_000_000), contentType: "image/png" });

    const out = JSON.parse(textOf(await voir("banners/7-lourde.png")));

    expect(out.code).toBe("limit_exceeded");
    expect(out.message).toMatch(/3906 Ko/);
    expect(out.message).toMatch(/plafond 3418 Ko/);
    expect(out.message).toMatch(/utilisable par les autres outils/);
  });

  // Les six échecs du téléchargement gardent leur identité, comme partout
  // ailleurs : un AVIF n'est pas une panne de réseau.
  it("un AVIF distant dit que c'est le format", async () => {
    net.fetchImageBytes.mockResolvedValue({ ok: false, reason: "bad_content_type" });
    const out = JSON.parse(textOf(await voir("https://x.test/a.avif")));
    expect(out.code).toBe("validation_error");
    expect(out.message).toMatch(/AVIF/);
  });

  it("une adresse interne reste un refus d'entrée", async () => {
    net.fetchImageBytes.mockResolvedValue({ ok: false, reason: "ssrf" });
    const out = JSON.parse(textOf(await voir("http://127.0.0.1/a.png")));
    expect(out.code).toBe("validation_error");
    expect(out.message).toMatch(/interne/i);
  });

  it("aucune trace de pile ne sort de l'outil", async () => {
    r2.readFromR2.mockRejectedValue(new Error("R2 binding absent: secret interne"));
    const out = JSON.parse(textOf(await voir("banners/7-abc.png")));
    expect(out.code).toBe("internal_error");
    expect(JSON.stringify(out)).not.toContain("secret interne");
  });
});

/**
 * La preuve qui manque aux tests ci-dessus : ils appellent le handler en
 * direct, donc ils vérifient ce que NOUS rendons, pas ce qui ARRIVE au
 * client. Si le SDK refusait ou aplatissait le bloc image, tous passeraient
 * au vert et l'assistant ne verrait toujours rien.
 */
describe("view_image : l'image traverse vraiment un client MCP", () => {
  it("un vrai client reçoit le bloc image, pas du base64 noyé dans du texte", async () => {
    const { Client, InMemoryTransport } = await import("@modelcontextprotocol/client");
    const { createMcpServer } = await import("@/lib/mcp/server");

    r2.readFromR2.mockResolvedValue({ bytes: PNG, contentType: "image/png" });

    const server = createMcpServer({ user: { id: "u", name: "n", role: "admin" }, clientId: "c" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const res = await client.callTool({ name: "view_image", arguments: { image: "banners/7-abc.png" } });
      const content = res.content as { type: string; data?: string; mimeType?: string }[];

      expect(content[0].type).toBe("image");
      expect(content[0].mimeType).toBe("image/png");
      expect(content[0].data).toBe(btoa("\x89PNG\r\n\x1a\n"));
      expect(res.isError).toBeFalsy();
    } finally {
      await client.close();
    }
  });
});
