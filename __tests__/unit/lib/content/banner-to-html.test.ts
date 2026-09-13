import { describe, it, expect } from "vitest";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";

const BASE = {
  title: "OnePlus 15",
  subtitle: null,
  badge_text: null,
  price: null,
  cta_text: null,
  link_url: "/p/oneplus-15",
};

describe("bannerTemplateToHtml", () => {
  it("rend toujours le titre", () => {
    expect(bannerTemplateToHtml(BASE)).toContain("OnePlus 15");
  });

  it("omet les champs vides", () => {
    const html = bannerTemplateToHtml(BASE);
    // La classe réelle est "nk-banner-badge" (jamais "nk-badge") et le prix est
    // rendu par formatPrice() en "199 000 F CFA" (jamais "XOF") : les deux
    // anciennes assertions ne pouvaient donc jamais échouer, même si le
    // convertisseur avait émis un badge ou un prix vides. On vérifie ici
    // l'absence des éléments eux-mêmes.
    expect(html).not.toContain('class="nk-banner-badge"');
    expect(html).not.toContain('class="nk-banner-price"');
  });

  it("rend le badge, le sous-titre et le prix quand ils existent", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Nouveauté",
      subtitle: "Snapdragon 8 Elite",
      price: 450000,
    });
    expect(html).toContain("Nouveauté");
    expect(html).toContain("Snapdragon 8 Elite");
    expect(html).toContain("450");
  });

  it("rend le bouton vers le lien, avec Découvrir par défaut", () => {
    const html = bannerTemplateToHtml(BASE);
    expect(html).toContain('href="/p/oneplus-15"');
    expect(html).toContain("Découvrir");
    expect(html).toContain("nk-cta");
  });

  it("respecte un libellé de bouton personnalisé", () => {
    expect(bannerTemplateToHtml({ ...BASE, cta_text: "Commander" })).toContain("Commander");
  });

  it("échappe le HTML des champs texte", () => {
    const html = bannerTemplateToHtml({ ...BASE, title: '<img src=x onerror="alert(1)">' });
    // Le HTML dangereux est échappé en entités : &lt;img…&gt;, pas <img…>
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    // L'attribut malveillant est aussi échappé : &quot;alert(1)&quot;, pas "alert(1)"
    expect(html).toContain("&quot;alert(1)&quot;");
    expect(html).not.toContain('"alert(1)"');
  });

  it("échappe chacun des quatre caractères, et traite & en premier", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      title: 'Tom & Jerry <b>"gras"</b> 5 > 3',
    });
    expect(html).toContain("Tom &amp; Jerry");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&quot;gras&quot;");
    expect(html).toContain("5 &gt; 3");
    // Si & était remplacé après <, le "<" deviendrait "&amp;lt;" et le client
    // verrait le texte de l'entité à l'écran.
    expect(html).not.toContain("&amp;lt;");
    expect(html).not.toContain("&amp;quot;");
  });

  it("produit un document conforme à la charte", () => {
    const html = bannerTemplateToHtml({
      ...BASE,
      badge_text: "Promo",
      subtitle: "Sous-titre",
      price: 199000,
      cta_text: "Voir",
    });
    expect(checkDesignConformance(html)).toEqual([]);
  });

  it("garde le lien contre les schémas dangereux", () => {
    // Chemin relatif : conservé
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/p/oneplus-15" }))
      .toContain('href="/p/oneplus-15"');

    // Chemin relatif dans d'autres catégories : conservé
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/c/promos" }))
      .toContain('href="/c/promos"');

    // Chemin relatif avec espace en début : l'espace C0 est retiré, le chemin est conservé
    expect(bannerTemplateToHtml({ ...BASE, link_url: "\t/p/x" }))
      .toContain('href="/p/x"');

    // URL http/https : conservée
    expect(bannerTemplateToHtml({ ...BASE, link_url: "https://example.com" }))
      .toContain("href=\"https://example.com\"");

    // URL protocol-relative avec // : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "//evil.example/x" }))
      .toContain('href="/"');

    // URL protocol-relative avec /\ : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/\\evil.example/x" }))
      .toContain('href="/"');

    // URL protocol-relative avec /\t (tab après le slash) : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/\t/evil.example/x" }))
      .toContain('href="/"');

    // URL protocol-relative avec /\n (newline après le slash) : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/\n/evil.example/x" }))
      .toContain('href="/"');

    // URL protocol-relative avec /\r (carriage return après le slash) : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/\r/evil.example/x" }))
      .toContain('href="/"');

    // javascript: : bloqué, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "javascript:alert(1)" }))
      .toContain('href="/"');

    // Case-insensitif pour javascript:
    expect(bannerTemplateToHtml({ ...BASE, link_url: "JaVaScRiPt:alert(1)" }))
      .toContain('href="/"');

    // data: : bloqué
    expect(bannerTemplateToHtml({ ...BASE, link_url: "data:text/html,<img src=x onerror=alert(1)>" }))
      .toContain('href="/"');

    // Chemin avec espace dans le slug : conservé (l'espace n'est pas un C0)
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/p/mon produit" }))
      .toContain('href="/p/mon produit"');

    // Chemin avec espace dans la query string : conservé
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/p/x?q=a b" }))
      .toContain('href="/p/x?q=a b"');

    // Caractère de contrôle null (0x00) : rejeté, retombe sur l'accueil
    expect(bannerTemplateToHtml({ ...BASE, link_url: "/p/x\x00bad" }))
      .toContain('href="/"');

    // Espacements en début/fin : conservés car retirés par trim()
    expect(bannerTemplateToHtml({ ...BASE, link_url: "  /p/x  " }))
      .toContain('href="/p/x"');

    // Espace insécable (NBSP) en tête : PAS un espace ASCII, un navigateur ne
    // le retire pas d'un bord d'URL — donc on ne le retire pas non plus. La
    // valeur ne commence alors plus par "/" et retombe, visiblement, sur
    // l'accueil plutôt que d'être silencieusement lue comme "/p/x".
    expect(bannerTemplateToHtml({ ...BASE, link_url: " /p/x" }))
      .toContain('href="/"');
  });

  it("survit à l'assainissement, qui est ce que la conversion lui fera subir", async () => {
    const { sanitizeDescriptionHtml } = await import("@/lib/utils/sanitize-html");
    const html = bannerTemplateToHtml({
      title: "OnePlus 15",
      subtitle: "Snapdragon 8 Elite",
      badge_text: "Nouveauté",
      price: 450000,
      cta_text: "Commander",
      link_url: "/p/oneplus-15",
    });
    // Égalité stricte : un toContain ne verrait pas une balise retirée au milieu.
    expect(sanitizeDescriptionHtml(html, "banner-7")).toBe(html);
  });
});
