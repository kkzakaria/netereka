import { describe, it, expect } from "vitest";
import { buildStoreSchemas, geoFromMapsUrl } from "@/lib/seo/store-schema";

// Shape of the real production row (Treichville), whitespace included.
const MAPS =
  "https://www.google.com/maps/place/NETEREKA/@5.2978885,-4.0074605,17z/data=!3m1!4b1!4m6!3m5!1s0xfc1ebc83e7573ef:0xc3d7dca5655f6b48!8m2!3d5.2978885!4d-4.0074605!16s%2Fg%2F11sv0z2l3v";
const store = {
  id: "s1",
  name: "NETREKA Treichville - Marché Samsung",
  address: "Treichville ",
  google_maps_url: MAPS,
  phone: "+2250576798673",
};

describe("geoFromMapsUrl", () => {
  it("lit le repère du lieu (!3d…!4d…)", () => {
    expect(geoFromMapsUrl(MAPS)).toEqual({ latitude: 5.2978885, longitude: -4.0074605 });
  });

  it("ne devine pas depuis le centre de la carte (@lat,lng) seul", () => {
    expect(geoFromMapsUrl("https://www.google.com/maps/@5.29,-4.00,17z")).toBeNull();
  });

  it("refuse des coordonnées hors bornes", () => {
    expect(geoFromMapsUrl("x!3d95.0!4d10.0")).toBeNull();
  });
});

describe("buildStoreSchemas", () => {
  const [schema] = buildStoreSchemas([store], "https://netereka.ci", "https://netereka.ci/logo.png");

  it("un ElectronicsStore rattaché à l'organisation du layout", () => {
    expect(schema["@type"]).toBe("ElectronicsStore");
    expect(schema.parentOrganization).toEqual({ "@id": "https://netereka.ci/#organization" });
    expect(schema["@id"]).toBe("https://netereka.ci/#store-s1");
  });

  it("adresse et téléphone viennent de la table, espaces retirés", () => {
    expect(schema.address).toMatchObject({ streetAddress: "Treichville", addressCountry: "CI" });
    expect(schema.telephone).toBe("+2250576798673");
    expect(schema.geo).toEqual({ "@type": "GeoCoordinates", latitude: 5.2978885, longitude: -4.0074605 });
  });

  it("n'émet ni téléphone ni coordonnées qu'il n'a pas", () => {
    const [bare] = buildStoreSchemas(
      [{ ...store, phone: null, google_maps_url: "https://maps.app.goo.gl/abc" }],
      "https://netereka.ci",
      "https://netereka.ci/logo.png",
    );
    expect(bare).not.toHaveProperty("telephone");
    expect(bare).not.toHaveProperty("geo");
  });

  it("aucun magasin actif → aucun schéma", () => {
    expect(buildStoreSchemas([], "https://netereka.ci", "x")).toEqual([]);
  });
});
