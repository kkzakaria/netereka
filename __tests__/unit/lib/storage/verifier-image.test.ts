import { describe, it, expect } from "vitest";
import { formatDesOctets } from "@/lib/storage/fetch-image";
import { verifierImageTeleversee } from "@/lib/storage/verifier-image";
import { octetsDe, fichierImage } from "../../../helpers/octets-image";

/**
 * La porte partagée des téléversements, et la raison d'être de son existence.
 *
 * Valider le TYPE DÉCLARÉ ne suffit pas, et pas pour une question de
 * malveillance : un navigateur déduit `File.type` de l'EXTENSION. Un
 * « photo.avif » renommé « photo.png » arrive donc avec `image/png`,
 * honnêtement, sans que personne n'ait menti — et la validation du type ne
 * voit rien. Le correctif précédent disait fermer ce scénario alors qu'il ne
 * fermait que le cas d'un client dont le nom et le type divergent.
 */
describe("formatDesOctets — les signatures, pas les déclarations", () => {
  it.each([["image/jpeg"], ["image/png"], ["image/webp"]])("reconnaît %s", (type) => {
    expect(formatDesOctets(octetsDe(type))).toEqual({ type });
  });

  // Reconnu POUR POUVOIR LE NOMMER : « ce fichier est un AVIF » aide, là où
  // « format inconnu » enverrait chercher ailleurs.
  it("reconnaît un AVIF pour le nommer dans le refus", () => {
    expect(formatDesOctets(octetsDe("image/avif"))).toEqual({ avif: true });
  });

  it("ne reconnaît ni un GIF ni des octets quelconques", () => {
    expect(formatDesOctets(octetsDe("image/gif"))).toBeNull();
    expect(formatDesOctets(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it("ne lève pas sur un fichier plus court que la signature", () => {
    expect(() => formatDesOctets(new Uint8Array([0xff]))).not.toThrow();
    expect(formatDesOctets(new Uint8Array(0))).toBeNull();
  });

  // Un WebP, c'est RIFF….WEBP : les quatre octets de taille au milieu ne
  // doivent pas entrer dans la comparaison.
  it("lit WEBP après les quatre octets de taille, quels qu'ils soient", () => {
    const b = octetsDe("image/webp");
    b[4] = 0xde; b[5] = 0xad; b[6] = 0xbe; b[7] = 0xef;
    expect(formatDesOctets(b)).toEqual({ type: "image/webp" });
  });
});

describe("verifierImageTeleversee — le cas que le type déclaré ne voit pas", () => {
  it("refuse un AVIF renommé .png et déclaré image/png", async () => {
    const r = await verifierImageTeleversee(fichierImage("image/png", "photo.png", "image/avif"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/est un AVIF, quelle que soit son extension/);
  });

  it("refuse des octets qui ne sont aucune des trois images", async () => {
    const r = await verifierImageTeleversee(fichierImage("image/png", "x.png", "application/inconnu"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/ses octets ne sont ni du JPEG/);
  });

  /**
   * Le type rendu sert À LA FOIS d'extension de clé et de `Content-Type`
   * stocké sur l'objet R2. C'est le seul gain de SÉCURITÉ réel ici : ce que
   * R2 servira vient d'une liste blanche, jamais d'un choix du client.
   */
  it("rend le format des OCTETS, pas celui déclaré", async () => {
    const r = await verifierImageTeleversee(fichierImage("image/png", "x.png", "image/jpeg"));
    expect(r).toEqual({ ok: true, type: "image/jpeg", extension: "jpg" });
  });

  it("accepte les trois formats retenus", async () => {
    for (const [type, ext] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]) {
      expect(await verifierImageTeleversee(fichierImage(type, `a.${ext}`))).toEqual({ ok: true, type, extension: ext });
    }
  });

  // Première barrière, gardée : elle coûte zéro octet de lecture et écarte
  // le gros des erreurs honnêtes, avec un message qui nomme le type refusé.
  it("refuse un type hors liste avant même de lire les octets", async () => {
    const r = await verifierImageTeleversee(fichierImage("image/gif", "anim.gif"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erreur).toMatch(/image\/gif/);
      expect(r.erreur).toMatch(/JPEG, le PNG et le WebP/);
    }
  });

  it("nomme « inconnu » un type vide plutôt que de rendre une phrase trouée", async () => {
    const r = await verifierImageTeleversee(new File([octetsDe("image/png")], "sans-type"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toContain("(inconnu)");
  });
});
