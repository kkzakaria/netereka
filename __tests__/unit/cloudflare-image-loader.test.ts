import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import cloudflareImageLoader from "@/lib/utils/cloudflare-image-loader";

describe("cloudflareImageLoader", () => {
  // The blob:/data: guard (line 10 of the loader) fires before the NODE_ENV
  // branch, so these tests run without any env stub — NODE_ENV defaults to
  // "test" in Vitest, which falls through to the production path, but the
  // guard intercepts first. The dev-stubbed tests below confirm this holds
  // when NODE_ENV is explicitly "development".
  describe("URLs spéciales (indépendant de l'environnement)", () => {
    it("retourne src inchangé pour une blob URL", () => {
      const blobUrl = "blob:http://localhost:3000/some-uuid";
      expect(cloudflareImageLoader({ src: blobUrl, width: 200 })).toBe(blobUrl);
    });

    it("retourne src inchangé pour une data URL", () => {
      const dataUrl = "data:image/png;base64,abc123";
      expect(cloudflareImageLoader({ src: dataUrl, width: 200 })).toBe(dataUrl);
    });
  });

  describe("en développement (NODE_ENV=development)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("retourne src avec ?w= pour une URL absolue", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/iphone.jpg",
          width: 640,
          quality: 75,
        })
      ).toBe("https://r2.netereka.ci/products/iphone.jpg?w=640");
    });

    it("retourne src avec ?w= pour un chemin relatif", () => {
      expect(
        cloudflareImageLoader({ src: "/images/placeholder.webp", width: 40 })
      ).toBe("/images/placeholder.webp?w=40");
    });

    it("ajoute &w= si des query params existent déjà", () => {
      expect(
        cloudflareImageLoader({ src: "/images/img.webp?v=1", width: 80 })
      ).toBe("/images/img.webp?v=1&w=80");
    });

    it("retourne blob URL inchangée même quand NODE_ENV=development", () => {
      const blobUrl = "blob:http://localhost:3000/some-uuid";
      expect(cloudflareImageLoader({ src: blobUrl, width: 200 })).toBe(blobUrl);
    });

    it("retourne data URL inchangée même quand NODE_ENV=development", () => {
      const dataUrl = "data:image/png;base64,abc123";
      expect(cloudflareImageLoader({ src: dataUrl, width: 200 })).toBe(dataUrl);
    });
  });

  describe("en production (NODE_ENV=production)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("génère une URL CF pour une URL R2 absolue", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/iphone.jpg",
          width: 640,
          quality: 75,
        })
      ).toBe(
        "/cdn-cgi/image/width=640,quality=75,format=auto/https://r2.netereka.ci/products/iphone.jpg"
      );
    });

    it("utilise quality=75 par défaut", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/img.jpg",
          width: 320,
        })
      ).toBe(
        "/cdn-cgi/image/width=320,quality=75,format=auto/https://r2.netereka.ci/products/img.jpg"
      );
    });

    it("génère une URL CF pour un chemin relatif (supprime le slash initial)", () => {
      expect(
        cloudflareImageLoader({
          src: "/images/placeholder.webp",
          width: 40,
          quality: 75,
        })
      ).toBe("/cdn-cgi/image/width=40,quality=75,format=auto/images/placeholder.webp");
    });

    it("respecte la quality passée en paramètre", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/banners/hero.jpg",
          width: 1200,
          quality: 90,
        })
      ).toBe(
        "/cdn-cgi/image/width=1200,quality=90,format=auto/https://r2.netereka.ci/banners/hero.jpg"
      );
    });

    it("gère les chemins relatifs sans slash initial", () => {
      expect(
        cloudflareImageLoader({
          src: "images/logo.png",
          width: 140,
          quality: 75,
        })
      ).toBe("/cdn-cgi/image/width=140,quality=75,format=auto/images/logo.png");
    });

    it("intègre les query params existants tels quels dans le chemin CF", () => {
      expect(
        cloudflareImageLoader({ src: "/images/img.webp?v=1", width: 80 })
      ).toBe("/cdn-cgi/image/width=80,quality=75,format=auto/images/img.webp?v=1");
    });
  });
});
