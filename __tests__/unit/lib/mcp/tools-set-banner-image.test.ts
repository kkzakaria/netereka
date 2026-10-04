import { describe, it, expect, vi, beforeEach } from "vitest";
import { textOf } from "@/lib/mcp/result";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDb, sqliteD1 } from "../../../helpers/sqlite-d1";
import type { McpContext } from "@/lib/mcp/context";

/**
 * `set_banner_image` : l'outil qui manquait pour qu'un assistant finisse une
 * bannière seul. Le 2026-10-02 il écrivait : « je n'ai pas d'outil pour
 * remplacer l'image d'une bannière », et composait donc un visuel autour
 * d'une image qu'il ne pouvait ni changer ni placer.
 *
 * Contre un vrai SQLite : ce qui compte ici est ce qui ATTERRIT — une
 * révision portant la CLÉ, jamais l'URL source, et aucune écriture sur la
 * ligne de la bannière.
 */
const holder = vi.hoisted(() => ({ binding: null as unknown }));
const storage = vi.hoisted(() => ({ deleteFromR2: vi.fn().mockResolvedValue(undefined), uploadToR2: vi.fn() }));
const fetcher = vi.hoisted(() => ({ fetchAndUploadImageTo: vi.fn() }));

vi.mock("@/lib/cloudflare/context", () => ({ getDB: async () => holder.binding }));
vi.mock("@/lib/storage/images", () => ({ deleteFromR2: storage.deleteFromR2, uploadToR2: storage.uploadToR2 }));
vi.mock("@/lib/storage/fetch-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/fetch-image")>()),
  fetchAndUploadImageTo: fetcher.fetchAndUploadImageTo,
}));

import { bannerTools } from "@/lib/mcp/tools/banners";

const ctx: McpContext = { user: { id: "admin-1", name: "Admin" , role: "admin" }, clientId: "client-1" };
const tool = bannerTools.find((t) => t.name === "set_banner_image")!;
const appel = async (input: Record<string, unknown>) => {
  const r = await tool.handler(ctx, input as never);
  return { isError: r.isError, out: JSON.parse(textOf(r)) };
};

const SOURCE = "https://images.example.test/visuel.png";

let db: DatabaseSync;

function banniere(id: number, image: string | null = null) {
  db.prepare(
    `INSERT INTO banners (id, title, link_url, display_order, is_active, image_url)
     VALUES (?, 'Bannière', '/x', 0, 1, ?)`,
  ).run(id, image);
}
const revisions = () =>
  db.prepare(`SELECT id, kind, payload, status FROM content_revisions`).all() as {
    id: string; kind: string; payload: string; status: string;
  }[];

beforeEach(() => {
  db = createMigratedDb();
  holder.binding = sqliteD1(db);
  storage.deleteFromR2.mockClear();
  fetcher.fetchAndUploadImageTo.mockReset().mockResolvedValue({
    ok: true, key: "banners/7/abc.png", contentType: "image/png", size: 1234,
  });
  vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://r2.netereka.ci");
});

describe("set_banner_image : ce qui est déposé", () => {
  it("dépose une révision portant la CLÉ, jamais l'URL source, et n'écrit pas la bannière", async () => {
    banniere(7, "banners/7/avant.png");

    const { out } = await appel({ id: 7, url: SOURCE });

    expect(out.applied).toBe("revision");
    expect(out.revision.status).toBe("pending");
    const [rev] = revisions();
    expect(JSON.parse(rev.payload)).toEqual({ image_url: "banners/7/abc.png" });
    expect(rev.payload).not.toContain("images.example.test");
    // La ligne n'a pas bougé : l'image n'apparaît qu'à l'application.
    expect((db.prepare(`SELECT image_url FROM banners WHERE id = 7`).get() as { image_url: string }).image_url)
      .toBe("banners/7/avant.png");
  });

  // Le préfixe vient du CODE et porte l'identifiant : deux bannières ne
  // partagent pas un dossier, et un retrait sait ce qu'il efface.
  it("téléverse sous le préfixe de la bannière", async () => {
    banniere(7);
    await appel({ id: 7, url: SOURCE });
    expect(fetcher.fetchAndUploadImageTo).toHaveBeenCalledWith("banners/7", SOURCE);
  });

  /**
   * L'URL rendue est celle que le modèle peut écrire dans un
   * `<img src="…">` s'il compose la bannière en HTML libre. Une clé R2 brute
   * n'y afficherait rien.
   */
  it("rend une URL déjà optimisée, utilisable telle quelle dans du HTML", async () => {
    vi.stubEnv("NODE_ENV", "production");
    banniere(7);
    const { out } = await appel({ id: 7, url: SOURCE });
    expect(out.image_key).toBe("banners/7/abc.png");
    // Transformée, pas l'adresse brute : c'est cette URL que l'auteur pose
    // dans son <img>, donc celle que le visiteur télécharge.
    expect(out.image_src).toBe(
      "/cdn-cgi/image/width=1280,quality=80,format=auto/https://r2.netereka.ci/banners/7/abc.png",
    );
    vi.unstubAllEnvs();
  });

  /**
   * `NEXT_PUBLIC_R2_URL` est une variable de BUILD : absente en local et en
   * préproduction, `getImageUrl` y rend `/images/<clé>`, un chemin qui ne
   * correspond à aucune route. Le livrer en promettant « une URL absolue »
   * enverrait le modèle composer autour d'une image invisible.
   */
  it("image_src est null plutôt qu'un chemin relatif quand l'adresse publique est inconnue", async () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "");
    banniere(7);

    const { out } = await appel({ id: 7, url: SOURCE });

    expect(out.image_key).toBe("banners/7/abc.png");
    expect(out.image_src).toBeNull();
    // Le dépôt, lui, a bien eu lieu : l'image est posée, seule son adresse
    // publique est hors de portée.
    expect(out.revision.status).toBe("pending");
  });

  it("url: null retire l'image et ne télécharge rien", async () => {
    banniere(7, "banners/7/avant.png");

    const { out } = await appel({ id: 7, url: null });

    expect(fetcher.fetchAndUploadImageTo).not.toHaveBeenCalled();
    expect(JSON.parse(revisions()[0].payload)).toEqual({ image_url: null });
    expect(out.image_key).toBeNull();
  });

  it("bannière inexistante : not_found, et rien n'est téléchargé", async () => {
    const { out } = await appel({ id: 99, url: SOURCE });
    expect(out.code).toBe("not_found");
    expect(fetcher.fetchAndUploadImageTo).not.toHaveBeenCalled();
  });

  it("la raison accompagne la révision jusqu'à l'écran de validation", async () => {
    banniere(7);
    await appel({ id: 7, url: SOURCE, reason: "Visuel de la campagne de janvier" });
    const row = db.prepare(`SELECT summary FROM content_revisions`).get() as { summary: string };
    expect(row.summary).toBe("Visuel de la campagne de janvier");
  });
});

describe("set_banner_image : les échecs gardent leur identité", () => {
  /**
   * Replier les six raisons sur « image inaccessible » enverrait le modèle
   * essayer une autre URL quand la cause est un AVIF — changer d'URL n'y
   * changera rien — ou une panne de notre stockage, où rien de ce qu'il
   * tentera n'aidera.
   */
  it("un AVIF dit que c'est le format, et nomme les formats acceptés", async () => {
    banniere(7);
    fetcher.fetchAndUploadImageTo.mockResolvedValue({ ok: false, reason: "bad_content_type" });

    const { isError, out } = await appel({ id: 7, url: SOURCE });

    expect(isError).toBe(true);
    expect(out.code).toBe("validation_error");
    expect(out.message).toMatch(/JPEG.+PNG.+WebP/i);
    expect(out.message).toMatch(/AVIF/);
    expect(revisions()).toHaveLength(0);
  });

  it("une adresse interne est une erreur d'entrée, pas une panne", async () => {
    banniere(7);
    fetcher.fetchAndUploadImageTo.mockResolvedValue({ ok: false, reason: "ssrf" });
    const { out } = await appel({ id: 7, url: SOURCE });
    expect(out.code).toBe("validation_error");
    expect(out.message).toMatch(/interne/i);
  });

  it("un échec de notre stockage est une panne, pas une faute de l'appelant", async () => {
    banniere(7);
    fetcher.fetchAndUploadImageTo.mockResolvedValue({ ok: false, reason: "upload_failed" });
    const { out } = await appel({ id: 7, url: SOURCE });
    expect(out.code).toBe("internal_error");
  });

  // Un 404 et un 403 n'appellent pas la même suite : l'un dit que l'URL est
  // inventée, l'autre qu'un hôte refuse les robots.
  it("un refus de l'hôte porte son code HTTP", async () => {
    banniere(7);
    fetcher.fetchAndUploadImageTo.mockResolvedValue({ ok: false, reason: "bad_status", status: 404 });
    const { out } = await appel({ id: 7, url: SOURCE });
    expect(out.message).toMatch(/HTTP 404/);
  });

  /**
   * L'objet est déjà en R2 quand le dépôt échoue : sans ce nettoyage, rien ne
   * le nommerait jamais — ni ligne, ni révision.
   */
  it("un dépôt qui échoue après le téléversement n'abandonne pas l'objet dans R2", async () => {
    banniere(7);
    // La course réelle : la bannière disparaît PENDANT le téléchargement,
    // donc après le contrôle d'existence et avant le dépôt. L'objet est déjà
    // en R2 quand `createRevision` lève « Cible introuvable ».
    fetcher.fetchAndUploadImageTo.mockImplementation(async () => {
      db.prepare(`DELETE FROM banners WHERE id = 7`).run();
      return { ok: true, key: "banners/7/abc.png", contentType: "image/png", size: 10 };
    });

    const { isError, out } = await appel({ id: 7, url: SOURCE });

    expect(isError).toBe(true);
    expect(out.code).toBe("not_found");
    expect(storage.deleteFromR2).toHaveBeenCalledWith("banners/7/abc.png");
    expect(revisions()).toHaveLength(0);
  });
});
