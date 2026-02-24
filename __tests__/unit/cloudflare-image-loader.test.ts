import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import cloudflareImageLoader from "@/lib/utils/cloudflare-image-loader";

describe("cloudflareImageLoader", () => {
  describe("en développement (NODE_ENV=development)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("retourne src inchangé pour une URL absolue", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/iphone.jpg",
          width: 640,
          quality: 75,
        })
      ).toBe("https://r2.netereka.ci/products/iphone.jpg");
    });

    it("retourne src inchangé pour un chemin relatif", () => {
      expect(
        cloudflareImageLoader({ src: "/images/placeholder.webp", width: 40 })
      ).toBe("/images/placeholder.webp");
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
  });
});
