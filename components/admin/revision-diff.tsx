import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";
import { ProductStory } from "@/components/storefront/product-story";
import { freeContentLayout } from "@/components/storefront/product-story/story-free-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  scopeFor,
  PRODUCT_HTML_COLUMNS,
  BANNER_HTML_COLUMNS,
  type RevisionKind,
  type RevisionTarget,
} from "@/lib/db/revisions";
import type { Banner, ProductDetail, ProductImage } from "@/lib/db/types";

/**
 * Décide si une révision se compare côte à côte à un état antérieur, ou se
 * montre seule.
 *
 * Une révision `publish` ne part pas d'un état visible pour le client : la
 * cible est encore un brouillon, il n'y a donc rien à comparer (§ 2.3 du
 * spec). Toute autre révision modifie une fiche déjà en ligne — son état
 * actuel existe et mérite d'être vu à côté de la proposition.
 *
 * Fonction pure et testée isolément : Vitest tourne en environnement `node`
 * sans jsdom dans ce dépôt, donc aucun composant de ce fichier ne peut être
 * rendu dans un test — seule cette décision, extraite du rendu, peut l'être.
 */
export function revisionLayout(kind: RevisionKind): "side-by-side" | "single" {
  return kind === "publish" ? "single" : "side-by-side";
}

/**
 * Classe de portée posée sur le conteneur du HTML libre, sous laquelle la
 * cible sera RÉELLEMENT rendue en production. `scopeFor` (lib/db/revisions.ts)
 * est la fonction que les trois écrivains utilisent déjà au dépôt pour
 * préfixer le CSS scopé stocké dans le HTML ; la reconstruire ici serait la
 * quatrième orthographe que ce projet a déjà payée une fois.
 *
 * Utilisée telle quelle pour le panneau « Proposé » et pour la vue seule
 * d'une révision `publish` — les deux montrent un rendu qui sera un jour
 * affiché sous cette portée exacte. Le panneau « Actuel », lui, passe par
 * `scopeCurrentPanel` ci-dessous : voir son commentaire pour pourquoi il ne
 * peut pas réutiliser cette même classe telle quelle.
 */
function scopeClassFor(target: RevisionTarget, targetId: string): string {
  return `desc-${scopeFor(target, targetId)}`;
}

/** Caractères qui prolongent un identifiant CSS — même ensemble que
 *  `continuesIdentifier` dans lib/utils/sanitize-html.ts, pour la même raison :
 *  `.desc-p1x` commence par les caractères de `.desc-p1` sans l'être. */
const IDENTIFIER_CONTINUATION_CLASS = "A-Za-z0-9_-";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Donne au panneau « Actuel » sa propre portée, distincte de celle du
 * panneau « Proposé », pour un HTML déjà assaini (donc déjà scopé une
 * première fois sous `scope`).
 *
 * Les deux panneaux comparent la MÊME cible et sont montés EN MÊME TEMPS —
 * contrairement aux onglets Description/FAQ de
 * components/storefront/product-details.tsx, où Radix ne monte que l'onglet
 * actif. Si les deux portaient la même classe, un `<style>` scopé dans la
 * proposition s'appliquerait AUSSI à la colonne « Actuel » : sept fiches en
 * ligne portent un `<style>` aujourd'hui (voir le commentaire de
 * `scopeCssSelectors`, lib/utils/sanitize-html.ts), et sur ces sept-là,
 * l'écran afficherait deux panneaux stylés à l'identique par la proposition
 * — l'administrateur en conclurait qu'il n'y a aucun changement visuel, et
 * appliquerait une révision qu'il n'a en réalité jamais vue. Une relecture
 * qui n'échoue pas mais induit en erreur est pire qu'une relecture qui ne
 * couvre pas ce cas.
 *
 * Les deux réécritures — le préfixe `.desc-<scope>` dans le `<style>`, et la
 * classe posée sur le conteneur au rendu — sont renvoyées ENSEMBLE par cette
 * unique fonction, pour qu'elles ne puissent pas dériver l'une de l'autre :
 * mettre à jour la classe sans le `<style>` (ou l'inverse) romprait
 * l'appariement sélecteur ↔ conteneur, et le panneau « Actuel » s'afficherait
 * nu — le mensonge inverse. Le panneau « Proposé » n'appelle jamais cette
 * fonction : il garde `scopeClassFor` telle quelle, sa portée réelle de
 * production.
 *
 * Un HTML sans `<style>` ressort inchangé à l'octet près — rien à isoler.
 */
export function scopeCurrentPanel(html: string, scope: string): { html: string; scopeClass: string } {
  const scopeClass = `desc-${scope}-actuel`;
  if (!html || !html.includes("<style")) {
    return { html, scopeClass };
  }

  const rawPrefix = `.desc-${scope}`;
  const newPrefix = `${rawPrefix}-actuel`;
  // `escapeRegExp` doit couvrir TOUT `rawPrefix`, `.` compris : `.` est un
  // métacaractère regex (« n'importe quel caractère ») et un `.` de scope non
  // échappé matcherait aussi bien un point littéral qu'un caractère
  // quelconque. `.mydesc-p1` (un point, puis "mydesc-p1") deviendrait alors
  // `.m.desc-p1-actuel` — un sélecteur qui ne correspond plus à rien, donc un
  // panneau stylé par rien : le mensonge inverse que cette fonction existe
  // pour empêcher.
  const prefixPattern = new RegExp(`${escapeRegExp(rawPrefix)}(?![${IDENTIFIER_CONTINUATION_CLASS}])`, "g");

  const rewritten = html.replace(/<style([^<>]*)>([\s\S]*?)(<\/style\s*>|$)/gi, (match, attrs: string, css: string, close: string) => {
    if (!css.includes(rawPrefix)) return match;
    // Remplaçant en fonction, pas en chaîne : une chaîne de remplacement
    // interprète `$&`, `` $` ``, `$'`, `$1`... comme des motifs spéciaux, et
    // `scope` (dérivé d'un id de cible) pourrait un jour en contenir un sans
    // qu'on l'ait prévu. Une fonction renvoie sa valeur de retour telle
    // quelle, sans repasser par cette interprétation.
    const rewrittenCss = css.replace(prefixPattern, () => newPrefix);
    return `<style${attrs}>${rewrittenCss}${close}`;
  });

  return { html: rewritten, scopeClass };
}

function productDescriptionHtml(description: string | null, descriptionType: string | undefined, productId: string): string {
  return descriptionToHtml(description ?? "", descriptionType, productId);
}

function productFaqHtml(faqHtml: string | null, productId: string): string {
  return faqHtml ? sanitizeDescriptionHtml(faqHtml, productId) : "";
}

function bannerContentHtml(contentHtml: string | null, bannerId: string): string {
  return contentHtml ? sanitizeDescriptionHtml(contentHtml, scopeFor("banner", bannerId)) : "";
}

function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Rendu de la description d'un produit tel qu'il sera réellement affiché :
 * `ProductStory` est le même composant que la fiche publique — pas une
 * réimplémentation — donc `nk-prose`, la mise en page selon
 * `description_type` et la classe de portée sont exactement celles que
 * verrait un visiteur. Réservé au panneau « Proposé » et à la vue seule
 * (`publish`) : c'est sous CETTE portée que la cible sera un jour rendue.
 */
function DescriptionBlockProposed({
  description,
  descriptionType,
  productId,
}: {
  description: string | null;
  descriptionType: string | undefined;
  productId: string;
}) {
  const html = productDescriptionHtml(description, descriptionType, productId);
  if (!html) return <EmptyNotice>Aucune description.</EmptyNotice>;
  return (
    <div className="rounded-lg border p-4">
      <ProductStory description={description} descriptionType={descriptionType} productId={productId} />
    </div>
  );
}

/**
 * Rendu de la description pour le panneau « Actuel » : ne peut pas réutiliser
 * `ProductStory` (elle calcule elle-même `desc-<productId>`, non
 * substituable) — reproduit donc sa mise en page (`freeContentLayout`,
 * story-free-content.tsx) mais sous la portée réécrite de
 * `scopeCurrentPanel`, pour ne jamais recevoir le `<style>` de la
 * proposition.
 */
function DescriptionBlockCurrent({
  description,
  descriptionType,
  productId,
}: {
  description: string | null;
  descriptionType: string | undefined;
  productId: string;
}) {
  const rawHtml = productDescriptionHtml(description, descriptionType, productId);
  if (!rawHtml) return <EmptyNotice>Aucune description.</EmptyNotice>;
  const { html, scopeClass } = scopeCurrentPanel(rawHtml, scopeFor("product", productId));
  const { outerClass, innerClass } = freeContentLayout(descriptionType);
  // Seul le mode "html" pose une classe de portée (story-free-content.tsx) :
  // richtext/plain/legacy n'embarquent jamais de <style> propre.
  const containerClass = descriptionType === "html" ? scopeClass : undefined;
  return (
    <div className="rounded-lg border p-4">
      <div className={outerClass || undefined}>
        <div className={cn(innerClass, containerClass) || undefined} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

/** Rendu de la FAQ d'un produit, même vocabulaire que l'onglet FAQ de
 *  components/storefront/product-details.tsx (`nk-prose desc-<productId>`).
 *  `variant="current"` réécrit la portée (`scopeCurrentPanel`) pour ne jamais
 *  recevoir le `<style>` de la proposition — voir son commentaire. */
function FaqBlock({
  faqHtml,
  productId,
  variant,
}: {
  faqHtml: string | null;
  productId: string;
  variant: "current" | "proposed";
}) {
  const rawHtml = productFaqHtml(faqHtml, productId);
  if (!rawHtml) return <EmptyNotice>Aucune FAQ.</EmptyNotice>;
  const { html, scopeClass } =
    variant === "current"
      ? scopeCurrentPanel(rawHtml, scopeFor("product", productId))
      : { html: rawHtml, scopeClass: scopeClassFor("product", productId) };
  return (
    <div className="rounded-lg border p-4">
      <div className={cn("nk-prose", scopeClass)} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** Rendu du contenu libre d'une bannière, même vocabulaire que
 *  components/storefront/hero-banner.tsx (`desc-banner-<id>`).
 *  `variant="current"` réécrit la portée — voir `scopeCurrentPanel`. */
function BannerContentBlock({
  contentHtml,
  bannerId,
  variant,
}: {
  contentHtml: string | null;
  bannerId: string;
  variant: "current" | "proposed";
}) {
  const rawHtml = bannerContentHtml(contentHtml, bannerId);
  if (!rawHtml) return <EmptyNotice>Aucun contenu.</EmptyNotice>;
  const { html, scopeClass } =
    variant === "current"
      ? scopeCurrentPanel(rawHtml, scopeFor("banner", bannerId))
      : { html: rawHtml, scopeClass: scopeClassFor("banner", bannerId) };
  return (
    <div className="rounded-lg border p-4">
      <div className={scopeClass} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Vignettes des images déjà attachées au produit — pas la galerie complète
 * (hors périmètre, cf. le commentaire de `RevisionDiff`), juste de quoi voir
 * d'un coup d'œil qu'il y en a, et lesquelles. Sur une boutique en paiement à
 * la livraison, l'image EST ce que le client croit acheter : un
 * administrateur qui applique une publication sans les voir peut mettre en
 * ligne une fiche sans aucun visuel et ne s'en apercevoir qu'au premier colis
 * refusé.
 */
function ImagesPreview({ images }: { images: ProductImage[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Images ({images.length})
      </p>
      {images.length === 0 ? (
        <EmptyNotice>Aucune image — le produit sera publié sans visuel.</EmptyNotice>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
              <Image
                src={getImageUrl(img.url)}
                alt={img.alt || "Image du produit"}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Bascule Description/FAQ d'un produit en onglets, jamais en piles empilées.
 *
 * Sur la fiche publique, `product-details.tsx` ne monte JAMAIS les deux à la
 * fois — Radix démonte l'onglet inactif — et c'est précisément ce qui rend
 * sûr que les deux partagent la même classe de portée (`desc-<productId>` au
 * dépôt). Empiler les deux blocs l'un sous l'autre dans une même carte, comme
 * ce composant le faisait, viole cette précondition : un `<style>` scopé
 * dans la description s'appliquerait alors AUSSI à la FAQ (et réciproquement)
 * dès qu'une fiche aurait les deux à la fois. Aucune fiche en ligne n'a
 * aujourd'hui de FAQ non vide parmi celles qui portent un `<style>` — mais la
 * généralisation du MCP (phase 2) est précisément ce qui va écrire des FAQ
 * sur ces fiches-là.
 *
 * Réutiliser le même mécanisme que la production (des onglets, pas une
 * nouvelle convention de nommage) évite d'inventer une n-ième portée
 * synthétique : le panneau « Proposé » garde ainsi sa portée réelle de
 * production sans exception, et le panneau « Actuel » réutilise tel quel le
 * seul suffixe `-actuel` déjà en place (`scopeCurrentPanel`) — un onglet
 * FAQ démonté ne peut pas être stylé par le `<style>` de l'onglet
 * Description monté, même si les deux portent la même classe.
 */
function ProductContentTabs({
  descriptionSlot,
  faqSlot,
}: {
  descriptionSlot: React.ReactNode;
  faqSlot: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="description">
      <TabsList variant="line" className="mb-4 min-h-11">
        <TabsTrigger value="description" className="px-3 text-sm">
          Description
        </TabsTrigger>
        <TabsTrigger value="faq" className="px-3 text-sm">
          FAQ
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description">{descriptionSlot}</TabsContent>
      <TabsContent value="faq">{faqSlot}</TabsContent>
    </Tabs>
  );
}

/**
 * Écarts à la charte du contenu proposé, affichés à côté du rendu — jamais un
 * motif de blocage : `checkDesignConformance` avertit, ne refuse jamais
 * (§ 2.2 du spec, hérité du lot A). Le bouton Appliquer reste actif quel que
 * soit le nombre d'écarts.
 */
function ConformanceSection({ fields }: { fields: { label: string; html: string }[] }) {
  const groups = fields
    .map((f) => ({ label: f.label, issues: f.html ? checkDesignConformance(f.html) : [] }))
    .filter((g) => g.issues.length > 0);
  if (groups.length === 0) return null;
  const total = groups.reduce((n, g) => n + g.issues.length, 0);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-sm font-medium">
        {total === 1 ? "1 écart à la charte" : `${total} écarts à la charte`}
        {" — l'application reste possible."}
      </p>
      {groups.map((g) => (
        <div key={g.label} className="mt-2">
          {groups.length > 1 && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</p>
          )}
          <ul className="mt-1 space-y-1.5">
            {g.issues.map((issue, i) => (
              <li key={`${issue.code}-${issue.line}-${i}`} className="text-sm text-muted-foreground">
                <span className="font-mono text-xs">ligne {issue.line}</span> — {issue.suggestion}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const PRODUCT_SCALAR_LABELS: Record<string, string> = {
  name: "Nom",
  base_price: "Prix",
  compare_price: "Prix barré",
  short_description: "Description courte",
  brand: "Marque",
  sku: "SKU",
  is_active: "Actif",
  is_featured: "Mis en avant",
  stock_quantity: "Stock",
  meta_title: "Titre SEO",
  meta_description: "Description SEO",
};

const BANNER_SCALAR_LABELS: Record<string, string> = {
  title: "Titre",
  subtitle: "Sous-titre",
  link_url: "Lien",
  cta_text: "Texte du bouton",
  price: "Prix",
  badge_text: "Badge",
  is_active: "Active",
  display_order: "Ordre d'affichage",
};

const PRICE_KEYS = new Set(["base_price", "compare_price", "price"]);
const BOOLEAN_KEYS = new Set(["is_active", "is_featured"]);

function formatScalar(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (PRICE_KEYS.has(key) && typeof value === "number") return formatPrice(value);
  if (BOOLEAN_KEYS.has(key)) return value ? "Oui" : "Non";
  return String(value);
}

interface ScalarChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

/** Champs simples (ni description, ni faq_html, ni content_html) proposés par
 *  la révision — un diff textuel leur convient très bien, à l'inverse du HTML
 *  libre (§ 2.4 du spec) : ce sont des valeurs, pas de la mise en forme. */
function changedScalarFields(
  target: RevisionTarget,
  current: Record<string, unknown>,
  payload: Record<string, unknown>,
): ScalarChange[] {
  const htmlColumns: readonly string[] = target === "banner" ? BANNER_HTML_COLUMNS : PRODUCT_HTML_COLUMNS;
  const labels = target === "banner" ? BANNER_SCALAR_LABELS : PRODUCT_SCALAR_LABELS;
  return Object.keys(payload)
    .filter((key) => !htmlColumns.includes(key))
    .map((key) => ({
      key,
      label: labels[key] ?? key,
      before: formatScalar(key, current[key]),
      after: formatScalar(key, payload[key]),
    }));
}

function ScalarChangesCard({ changes }: { changes: ScalarChange[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Autres champs modifiés</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {changes.map((c) => (
            <div key={c.key} className="rounded-lg border p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</dt>
              <dd className="mt-1 text-sm">
                <span className="text-muted-foreground line-through">{c.before}</span>
                {" → "}
                <span className="font-medium">{c.after}</span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export interface RevisionDiffProps {
  target: RevisionTarget;
  kind: RevisionKind;
  targetId: string;
  /** État actuel de la cible en base (produit ou bannière). */
  current: ProductDetail | Banner;
  /** Colonnes proposées par la révision — déjà assainies au dépôt. */
  payload: Record<string, unknown>;
}

/**
 * Écran de comparaison d'une révision : rendu, pas source (§ 2.4 du spec).
 *
 * `publish` (aucun état antérieur côté client) montre la fiche complète en
 * une colonne ; toute autre révision montre l'actuel et le proposé côte à
 * côte. La décision est déléguée à `revisionLayout`, seule partie testée de
 * ce fichier.
 *
 * Se limite volontairement aux champs qui comptent pour une relecture : le
 * HTML libre (description, FAQ, contenu de bannière), les champs texte que la
 * révision touche, et — pour la vue seule d'une révision `publish` — les
 * vignettes des images déjà attachées au produit (une boutique en paiement à
 * la livraison ne peut pas se permettre qu'une mise en ligne sans visuel
 * passe inaperçue). La parité visuelle complète avec la fiche boutique
 * (galerie, carrousel, variantes, avis) reste hors périmètre de cette tâche.
 */
export function RevisionDiff({ target, kind, targetId, current, payload }: RevisionDiffProps) {
  const layout = revisionLayout(kind);
  const scalarChanges = changedScalarFields(target, current as unknown as Record<string, unknown>, payload);

  if (target === "banner") {
    const currentBanner = current as Banner;
    const proposedBanner: Banner = { ...currentBanner, ...(payload as Partial<Banner>) };

    if (layout === "single") {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{proposedBanner.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BannerContentBlock contentHtml={proposedBanner.content_html} bannerId={targetId} variant="proposed" />
              <ConformanceSection
                fields={[{ label: "Contenu", html: bannerContentHtml(proposedBanner.content_html, targetId) }]}
              />
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {scalarChanges.length > 0 && <ScalarChangesCard changes={scalarChanges} />}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <BannerContentBlock contentHtml={currentBanner.content_html} bannerId={targetId} variant="current" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Proposé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BannerContentBlock contentHtml={proposedBanner.content_html} bannerId={targetId} variant="proposed" />
              <ConformanceSection
                fields={[{ label: "Contenu", html: bannerContentHtml(proposedBanner.content_html, targetId) }]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentProduct = current as ProductDetail;
  const proposedProduct: ProductDetail = { ...currentProduct, ...(payload as Partial<ProductDetail>) };

  if (layout === "single") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{proposedProduct.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatPrice(proposedProduct.base_price)}
              {proposedProduct.brand ? ` · ${proposedProduct.brand}` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImagesPreview images={currentProduct.images} />
            <ProductContentTabs
              descriptionSlot={
                <DescriptionBlockProposed
                  description={proposedProduct.description}
                  descriptionType={proposedProduct.description_type}
                  productId={targetId}
                />
              }
              faqSlot={<FaqBlock faqHtml={proposedProduct.faq_html} productId={targetId} variant="proposed" />}
            />
            <ConformanceSection
              fields={[
                {
                  label: "Description",
                  html: productDescriptionHtml(proposedProduct.description, proposedProduct.description_type, targetId),
                },
                { label: "FAQ", html: productFaqHtml(proposedProduct.faq_html, targetId) },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scalarChanges.length > 0 && <ScalarChangesCard changes={scalarChanges} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actuel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProductContentTabs
              descriptionSlot={
                <DescriptionBlockCurrent
                  description={currentProduct.description}
                  descriptionType={currentProduct.description_type}
                  productId={targetId}
                />
              }
              faqSlot={<FaqBlock faqHtml={currentProduct.faq_html} productId={targetId} variant="current" />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proposé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProductContentTabs
              descriptionSlot={
                <DescriptionBlockProposed
                  description={proposedProduct.description}
                  descriptionType={proposedProduct.description_type}
                  productId={targetId}
                />
              }
              faqSlot={<FaqBlock faqHtml={proposedProduct.faq_html} productId={targetId} variant="proposed" />}
            />
            <ConformanceSection
              fields={[
                {
                  label: "Description",
                  html: productDescriptionHtml(proposedProduct.description, proposedProduct.description_type, targetId),
                },
                { label: "FAQ", html: productFaqHtml(proposedProduct.faq_html, targetId) },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
