import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { checkDesignConformance } from "@/lib/content/check-design-conformance";
import { ProductStory } from "@/components/storefront/product-story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  scopeFor,
  PRODUCT_HTML_COLUMNS,
  BANNER_HTML_COLUMNS,
  type RevisionKind,
  type RevisionTarget,
} from "@/lib/db/revisions";
import type { Product, Banner } from "@/lib/db/types";

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
 * Classe de portée posée sur le conteneur du HTML libre, identique des deux
 * côtés de la comparaison puisque les deux rendent la MÊME cible. `scopeFor`
 * (lib/db/revisions.ts) est la fonction que les trois écrivains utilisent déjà
 * au dépôt pour préfixer le CSS scopé stocké dans le HTML ; une reconstruire
 * ici serait la quatrième orthographe que ce projet a déjà payée une fois.
 *
 * Conséquence à connaître : les deux colonnes sont montées EN MÊME TEMPS (pas
 * un accordéon d'onglets démonté), et portent donc la même classe. Si la
 * proposition change le <style> scopé qu'elle transporte, ses règles
 * s'appliquent aussi à la colonne de gauche (et réciproquement) — le même
 * risque que documente déjà le commentaire sur l'onglet FAQ de
 * components/storefront/product-details.tsx pour deux blocs partageant une
 * portée. Inévitable ici : le HTML stocké a ses sélecteurs déjà préfixés par
 * cette classe exacte au moment de l'assainissement (sanitizePayload) — une
 * classe différente casserait le CSS de l'auteur au lieu de le isoler.
 */
function scopeClassFor(target: RevisionTarget, targetId: string): string {
  return `desc-${scopeFor(target, targetId)}`;
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
 * Rendu de la description d'un produit, dans l'application : `ProductStory`
 * est le même composant que la fiche publique — pas une réimplémentation —
 * donc `nk-prose`, la mise en page selon `description_type` et la classe de
 * portée sont exactement celles que verrait un visiteur.
 */
function DescriptionBlock({
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

/** Rendu de la FAQ d'un produit, même vocabulaire que l'onglet FAQ de
 *  components/storefront/product-details.tsx (`nk-prose desc-<productId>`). */
function FaqBlock({ faqHtml, productId }: { faqHtml: string | null; productId: string }) {
  const html = productFaqHtml(faqHtml, productId);
  if (!html) return <EmptyNotice>Aucune FAQ.</EmptyNotice>;
  return (
    <div className="rounded-lg border p-4">
      <div className={cn("nk-prose", scopeClassFor("product", productId))} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** Rendu du contenu libre d'une bannière, même vocabulaire que
 *  components/storefront/hero-banner.tsx (`desc-banner-<id>`). */
function BannerContentBlock({ contentHtml, bannerId }: { contentHtml: string | null; bannerId: string }) {
  const html = bannerContentHtml(contentHtml, bannerId);
  if (!html) return <EmptyNotice>Aucun contenu.</EmptyNotice>;
  return (
    <div className="rounded-lg border p-4">
      <div className={scopeClassFor("banner", bannerId)} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
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
  current: Product | Banner;
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
 * HTML libre (description, FAQ, contenu de bannière) et les champs texte que
 * la révision touche. La parité visuelle complète avec la fiche boutique
 * (galerie, variantes, avis) est hors périmètre de cette tâche.
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
              <BannerContentBlock contentHtml={proposedBanner.content_html} bannerId={targetId} />
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
              <BannerContentBlock contentHtml={currentBanner.content_html} bannerId={targetId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Proposé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BannerContentBlock contentHtml={proposedBanner.content_html} bannerId={targetId} />
              <ConformanceSection
                fields={[{ label: "Contenu", html: bannerContentHtml(proposedBanner.content_html, targetId) }]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentProduct = current as Product;
  const proposedProduct: Product = { ...currentProduct, ...(payload as Partial<Product>) };

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
            <DescriptionBlock
              description={proposedProduct.description}
              descriptionType={proposedProduct.description_type}
              productId={targetId}
            />
            <FaqBlock faqHtml={proposedProduct.faq_html} productId={targetId} />
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
            <DescriptionBlock
              description={currentProduct.description}
              descriptionType={currentProduct.description_type}
              productId={targetId}
            />
            <FaqBlock faqHtml={currentProduct.faq_html} productId={targetId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proposé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DescriptionBlock
              description={proposedProduct.description}
              descriptionType={proposedProduct.description_type}
              productId={targetId}
            />
            <FaqBlock faqHtml={proposedProduct.faq_html} productId={targetId} />
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
