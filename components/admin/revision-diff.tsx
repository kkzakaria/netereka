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
  resolveVariantPrice,
  PRODUCT_HTML_COLUMNS,
  BANNER_HTML_COLUMNS,
  type BannerWritableColumn,
  type ProductWritableColumn,
  type RevisionKind,
  type RevisionTarget,
} from "@/lib/db/revisions";
import type { Banner, ProductDetail, ProductImage, ProductVariant } from "@/lib/db/types";
import type { WithdrawImpact } from "@/lib/db/withdraw-impact";
import type { ReactivationReadiness } from "@/lib/db/reactivation-readiness";
import { reactivationReading } from "@/lib/revisions/reactivation-reading";
import { bannerClock } from "@/lib/db/storefront/banners";
import { dateWithdrawalWarning, withdrawalReading, type WithdrawalLine } from "@/lib/revisions/withdraw-reading";

/**
 * Décide comment une révision se présente : seule, côte à côte avec l'état
 * actuel, ou via le rendu dédié aux révisions qui n'écrivent aucune colonne
 * de `products`/`banners`.
 *
 * - `publish` ne part pas d'un état visible pour le client : la cible est
 *   encore un brouillon, il n'y a donc rien à comparer (§ 2.3 du spec) →
 *   `"single"`.
 * - `create` n'a pas non plus d'état antérieur (§ 2.7) : rendu en `update`, le
 *   filtre d'égalité de `changedScalarFields` éliminerait précisément les
 *   champs qu'un modèle vient d'écrire — `"single"`, l'objet entier.
 * - `update` modifie des colonnes d'une fiche déjà en ligne : son état actuel
 *   existe et mérite d'être vu à côté de la proposition → `"side-by-side"`,
 *   la comparaison Description/FAQ de `ProductContentTabs`.
 * - `withdraw` (§ 2.6) : un retrait est une absence, donc invisible par nature.
 *   Ni comparaison ni objet neuf : l'écran montre ce qui DISPARAÎT, chiffré
 *   (`WithdrawalScreen`) — `"withdrawal"`.
 * - `reactivate` (§ 2.6 bis) est l'inverse, et plus léger : une remise en ligne
 *   est une apparition, qui se voit au premier chargement. Comme `publish` et
 *   `create`, l'objet ENTIER en une colonne — mais précédé de ce qui rend la
 *   fiche impropre à la vitrine (`ReactivationScreen`), parce que c'est ce
 *   qu'une remise en ligne risque de laisser passer — `"reactivation"`.
 * - `add_images`/`remove_image`/`set_variants` (phase 2) n'écrivent JAMAIS de
 *   colonne de `products` : leur payload porte une forme différente à chaque
 *   fois (tableau d'images, id d'image, tableau de variantes — voir
 *   `RevisionKind` dans lib/db/revisions.ts), que `ProductContentTabs` ne
 *   sait pas représenter et que le diff de champs scalaires
 *   (`changedScalarFields`) rendrait en `[object Object]` s'il la recevait
 *   (c'est exactement le défaut que cette troisième valeur referme) → une
 *   troisième valeur, `"child"`, pour un rendu dédié par nature de révision.
 *   Ces trois natures ne s'appliquent qu'à un produit (`assertValidPayload`,
 *   lib/db/revisions.ts) : `"child"` n'est donc jamais atteint pour une
 *   bannière.
 *
 * Fonction pure et testée isolément : Vitest tourne en environnement `node`
 * sans jsdom dans ce dépôt, donc aucun composant de ce fichier ne peut être
 * rendu dans un test — seule cette décision, extraite du rendu, peut l'être.
 */
export function revisionLayout(kind: RevisionKind): "side-by-side" | "single" | "child" | "withdrawal" | "reactivation" {
  // Switch EXHAUSTIF, sans `default` qui avale : une nouvelle `RevisionKind`
  // (`withdraw`, § 2.6) échoue ici à la COMPILATION au lieu de tomber dans
  // `"child"`, dont le rendu est un <div> vide au-dessus du bouton Appliquer.
  switch (kind) {
    case "publish":
    case "create":
      return "single";
    case "update":
      return "side-by-side";
    case "withdraw":
      return "withdrawal";
    case "reactivate":
      return "reactivation";
    case "add_images":
    case "remove_image":
    case "set_variants":
      return "child";
    default: {
      const inconnue: never = kind;
      throw new Error(`Nature de révision sans écran : ${String(inconnue)}`);
    }
  }
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
 * Vignette d'image de révision, avec un badge textuel optionnel (« Nouvelle »,
 * « Supprimée »). `alt`/`badge.text` sont du texte rendu par React (échappé
 * automatiquement) — jamais du HTML injecté, contrairement au contenu libre
 * (description/FAQ/bannière) plus haut dans ce fichier : la portée de
 * `scopeCurrentPanel` ne concerne donc pas ce composant, il n'y a rien à isoler.
 */
function RevisionImageThumb({
  src,
  alt,
  badge,
}: {
  src: string;
  alt: string;
  badge?: { text: string; tone: "added" | "removed" };
}) {
  return (
    <div
      className={cn(
        "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border",
        badge?.tone === "added" && "ring-2 ring-primary",
        badge?.tone === "removed" && "opacity-50 ring-2 ring-destructive",
      )}
    >
      <Image src={src} alt={alt} fill sizes="64px" className="object-cover" />
      {badge && (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 truncate px-1 text-center text-[10px] font-medium text-white",
            badge.tone === "added" ? "bg-primary" : "bg-destructive",
          )}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

interface AddImagesPayload {
  images: { key: string; alt: string | null }[];
}

/** Revalide la FORME du payload `add_images` avant affichage — au même
 *  niveau d'exigence que `assertValidPayload` (lib/db/revisions.ts) au dépôt,
 *  pour ne jamais laisser un payload inattendu produire un rendu silencieux
 *  et faux plutôt qu'un message explicite. */
function parseAddImagesPayload(payload: Record<string, unknown>): AddImagesPayload | null {
  const images = (payload as { images?: unknown }).images;
  if (!Array.isArray(images)) return null;
  const parsed: AddImagesPayload["images"] = [];
  for (const item of images) {
    const key = (item as { key?: unknown } | null)?.key;
    if (typeof key !== "string" || key.length === 0) return null;
    const alt = (item as { alt?: unknown } | null)?.alt;
    parsed.push({ key, alt: typeof alt === "string" ? alt : null });
  }
  return { images: parsed };
}

/**
 * Rendu d'une révision `add_images` : la galerie actuelle, inchangée, à côté
 * d'elle-même augmentée des images proposées — visuellement distinguées
 * (« Nouvelle »). Les clés R2 sont déjà en place au dépôt (§ commentaire de
 * haut de fichier de lib/mcp/tools/products.ts) : la vignette proposée ne
 * dépend d'aucun téléchargement différé, elle pointe la même clé que
 * l'application écrira. Sur un paiement à la livraison l'image EST ce que le
 * client croit acheter (cf. `ImagesPreview`) : un compte ne suffit jamais.
 */
function AddImagesDiff({ current, payload }: { current: ProductDetail; payload: Record<string, unknown> }) {
  const parsed = parseAddImagesPayload(payload);
  if (!parsed) {
    return <EmptyNotice>Payload de révision invalide — impossible d&apos;afficher les images proposées.</EmptyNotice>;
  }
  const count = parsed.images.length;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ImagesPreview images={current.images} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Proposé — {count === 1 ? "1 image ajoutée" : `${count} images ajoutées`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {current.images.map((img) => (
              <RevisionImageThumb key={img.id} src={getImageUrl(img.url)} alt={img.alt || "Image du produit"} />
            ))}
            {parsed.images.map((img, i) => (
              <RevisionImageThumb
                key={`new-${i}`}
                src={getImageUrl(img.key)}
                alt={img.alt || "Nouvelle image"}
                badge={{ text: "Nouvelle", tone: "added" }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface RemoveImagePayload {
  imageId: string;
}

function parseRemoveImagePayload(payload: Record<string, unknown>): RemoveImagePayload | null {
  const imageId = (payload as { image_id?: unknown }).image_id;
  if (typeof imageId !== "string" || imageId.length === 0) return null;
  return { imageId };
}

/**
 * Images d'un produit après retrait de `imageId` — extrait de
 * `RemoveImageDiff` pour être testé isolément : un filtre qui comparerait le
 * mauvais champ montrerait « reste » une image qui en réalité disparaît, ou
 * l'inverse — le mensonge exact que ce composant existe pour empêcher.
 */
export function imagesAfterRemoval(images: ProductImage[], imageId: string): ProductImage[] {
  return images.filter((img) => img.id !== imageId);
}

/**
 * Rendu d'une révision `remove_image` : la galerie actuelle avec l'image
 * concernée signalée (« Supprimée »), à côté de la galerie telle qu'elle
 * resterait après application — « Image 3 supprimée » n'est pas relisible,
 * l'image l'est.
 */
function RemoveImageDiff({ current, payload }: { current: ProductDetail; payload: Record<string, unknown> }) {
  const parsed = parseRemoveImagePayload(payload);
  if (!parsed) {
    return <EmptyNotice>Payload de révision invalide — impossible d&apos;identifier l&apos;image concernée.</EmptyNotice>;
  }
  const target = current.images.find((img) => img.id === parsed.imageId);
  const remaining = imagesAfterRemoval(current.images, parsed.imageId);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {current.images.map((img) => (
              <RevisionImageThumb
                key={img.id}
                src={getImageUrl(img.url)}
                alt={img.alt || "Image du produit"}
                badge={img.id === parsed.imageId ? { text: "Supprimée", tone: "removed" } : undefined}
              />
            ))}
          </div>
          {!target && (
            <p className="mt-2 text-xs text-muted-foreground">
              Image introuvable — elle a peut-être déjà été retirée depuis le dépôt de cette révision.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Proposé</CardTitle>
        </CardHeader>
        <CardContent>
          <ImagesPreview images={remaining} />
        </CardContent>
      </Card>
    </div>
  );
}

interface SetVariantsPayload {
  variants: { color_name: string; color_hex: string; price: number | null; stock: number }[];
  uniformPrice: boolean;
}

function parseSetVariantsPayload(payload: Record<string, unknown>): SetVariantsPayload | null {
  const variants = (payload as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) return null;
  const parsed: SetVariantsPayload["variants"] = [];
  for (const item of variants) {
    const entry = item as Record<string, unknown> | null;
    const colorName = entry?.color_name;
    const colorHex = entry?.color_hex;
    const stock = entry?.stock;
    if (typeof colorName !== "string" || typeof colorHex !== "string" || typeof stock !== "number") return null;
    const price = entry?.price;
    parsed.push({ color_name: colorName, color_hex: colorHex, stock, price: typeof price === "number" ? price : null });
  }
  const uniformPrice = (payload as { uniform_price?: unknown }).uniform_price;
  return { variants: parsed, uniformPrice: uniformPrice !== false };
}

/** Découpe la clé couleur `"<nom>:<hex>"` écrite par `buildSetVariantsStatements`
 *  (lib/db/revisions.ts) et `setColorVariants` (lib/db/product-drafts.ts) —
 *  toujours sous cette forme exacte pour toute variante que ce dépôt a lui-même
 *  écrite, donc un simple `lastIndexOf(":#")` suffit (le nom peut contenir
 *  ":", il ne peut pas contenir ":#" suivi de 6 hexadécimaux par coïncidence). */
function parseColorKey(key: string): { name: string; hex: string } {
  const idx = key.lastIndexOf(":#");
  if (idx > 0) return { name: key.slice(0, idx), hex: key.slice(idx + 1) };
  return { name: key, hex: "#000000" };
}

export interface VariantDiffRow {
  key: string;
  colorName: string;
  colorHex: string;
  status: "added" | "removed" | "kept";
  currentPrice: number | null;
  currentStock: number | null;
  proposedPrice: number | null;
  proposedStock: number | null;
}

/**
 * Compare l'ensemble actuel de variantes couleur à l'ensemble proposé, ligne
 * par ligne — `set_variants` REMPLACE tout l'ensemble (jamais un patch), donc
 * la seule relecture qui vaille est visuelle : qui apparaît, qui disparaît,
 * qui change de prix. Extrait de `SetVariantsDiff` pour être testé
 * isolément.
 *
 * Le prix proposé appelle `resolveVariantPrice` (lib/db/revisions.ts) — la
 * MÊME fonction que `buildSetVariantsStatements` appelle à l'application —
 * plutôt que de rejouer la formule ici : un commentaire disant « même
 * formule qu'à l'application » ne garantit rien si le code, lui, en porte
 * deux copies qui peuvent diverger séparément. Sur une boutique en paiement
 * à la livraison, une divergence signifierait un prix approuvé par
 * l'administrateur différent de celui facturé au client, découvert à la
 * porte — la seule protection réelle est qu'il n'existe qu'un seul endroit
 * où se tromper.
 *
 * Le même diffing par clé couleur (`nom:hex`) que `buildSetVariantsStatements`
 * — une variante actuelle aux attributs malformés ou multi-clés est ignorée,
 * comme à l'application, plutôt que de fausser la comparaison.
 */
export function diffVariants(
  current: Pick<ProductVariant, "price" | "stock_quantity" | "attributes">[],
  proposed: SetVariantsPayload["variants"],
  options: { uniformPrice: boolean; basePrice: number },
): VariantDiffRow[] {
  const currentByKey = new Map<string, { price: number; stock: number }>();
  for (const v of current) {
    try {
      const attrs = JSON.parse(v.attributes) as Record<string, unknown>;
      const keys = Object.keys(attrs);
      if (keys.length === 1 && keys[0] === "color" && typeof attrs.color === "string") {
        currentByKey.set(attrs.color, { price: v.price, stock: v.stock_quantity });
      }
    } catch {
      // Attributs malformés : cette variante n'entre dans aucune comparaison
      // par couleur, exactement comme `buildSetVariantsStatements` à
      // l'application (lib/db/revisions.ts) — un throw ici bloquerait
      // l'écran entier pour une ligne que l'application elle-même ignore.
    }
  }

  const rows: VariantDiffRow[] = [];
  const seen = new Set<string>();

  for (const entry of proposed) {
    const key = `${entry.color_name}:${entry.color_hex}`;
    seen.add(key);
    const existing = currentByKey.get(key);
    const resolvedPrice = resolveVariantPrice(entry.price, options.uniformPrice, options.basePrice);
    rows.push({
      key,
      colorName: entry.color_name,
      colorHex: entry.color_hex,
      status: existing ? "kept" : "added",
      currentPrice: existing?.price ?? null,
      currentStock: existing?.stock ?? null,
      proposedPrice: resolvedPrice,
      proposedStock: entry.stock,
    });
  }

  for (const [key, v] of currentByKey) {
    if (seen.has(key)) continue;
    const { name, hex } = parseColorKey(key);
    rows.push({
      key,
      colorName: name,
      colorHex: hex,
      status: "removed",
      currentPrice: v.price,
      currentStock: v.stock,
      proposedPrice: null,
      proposedStock: null,
    });
  }

  return rows;
}

const VARIANT_STATUS_LABELS: Record<VariantDiffRow["status"], string> = {
  added: "Ajoutée",
  removed: "Retirée",
  kept: "Conservée",
};

/**
 * Rendu d'une révision `set_variants` : table Actuel/Proposé, une ligne par
 * couleur — `diffVariants` porte la logique, ce composant ne fait que la
 * mettre en forme. `colorHex` alimente un `style` inline (`backgroundColor`),
 * jamais un `<style>` ni du HTML injecté : aucun rapport avec la portée CSS
 * que `scopeCurrentPanel` protège plus haut dans ce fichier.
 */
function SetVariantsDiff({ current, payload }: { current: ProductDetail; payload: Record<string, unknown> }) {
  const parsed = parseSetVariantsPayload(payload);
  if (!parsed) {
    return <EmptyNotice>Payload de révision invalide — impossible d&apos;afficher les variantes proposées.</EmptyNotice>;
  }
  const rows = diffVariants(current.variants, parsed.variants, {
    uniformPrice: parsed.uniformPrice,
    basePrice: current.base_price,
  });
  if (rows.length === 0) {
    return <EmptyNotice>Aucune variante, ni avant ni après application.</EmptyNotice>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variantes — actuel et proposé</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Couleur</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Stock actuel</th>
              <th className="py-2 pr-3">Stock proposé</th>
              <th className="py-2 pr-3">Prix actuel</th>
              <th className="py-2">Prix proposé</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border"
                      style={{ backgroundColor: row.colorHex }}
                      aria-hidden="true"
                    />
                    {row.colorName}
                  </span>
                </td>
                <td className="py-2 pr-3">{VARIANT_STATUS_LABELS[row.status]}</td>
                <td className="py-2 pr-3">{row.currentStock ?? "—"}</td>
                <td className={cn("py-2 pr-3", row.proposedStock !== row.currentStock && "font-medium")}>
                  {row.proposedStock ?? "—"}
                </td>
                <td className="py-2 pr-3">{row.currentPrice != null ? formatPrice(row.currentPrice) : "—"}</td>
                <td className={cn("py-2", row.proposedPrice !== row.currentPrice && "font-medium")}>
                  {row.proposedPrice != null ? formatPrice(row.proposedPrice) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
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

const PRICE_KEYS = new Set(["base_price", "compare_price", "price"]);
const BOOLEAN_KEYS = new Set(["is_active", "is_featured"]);

function formatScalar(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (PRICE_KEYS.has(key) && typeof value === "number") return formatPrice(value);
  if (BOOLEAN_KEYS.has(key)) return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.length === 0 ? "—" : `${value.length} élément(s)`;
  return String(value);
}

interface ScalarChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

/**
 * Champs simples (ni description, ni faq_html, ni content_html) proposés par
 * la révision — un diff textuel leur convient très bien, à l'inverse du HTML
 * libre (§ 2.4 du spec) : ce sont des valeurs, pas de la mise en forme.
 *
 * Exportée pour être testée directement : ne renvoie que les champs dont la
 * valeur AFFICHÉE change réellement — un payload `update` peut porter une
 * colonne inchangée (ex. `description_type: "html"` ré-envoyée avec la même
 * valeur qu'en base par `productColumnsForRevision`, lib/db/product-drafts.ts,
 * chaque fois que `description_html` est modifié). Sans ce filtre, l'écran
 * affichait une ligne de bruit « html → html » — mesuré sur 773 des 996
 * fiches publiées.
 */
export function changedScalarFields(
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
    }))
    .filter((change) => change.before !== change.after);
}

/**
 * Libellé de chaque colonne ÉCRIVABLE, typé sur la liste blanche du dépôt :
 * une colonne ajoutée à `BANNER_WRITABLE_COLUMN_LIST` fait échouer la
 * COMPILATION ici, au lieu d'atteindre la boutique sans s'afficher à la
 * relecture (même dérive que B1, une liste d'affichage tenue à la main).
 * `null` = HTML libre, rendu à part (`BannerContentBlock`).
 */
const BANNER_REVIEW_LABELS: Record<BannerWritableColumn, string | null> = {
  title: "Titre",
  subtitle: "Sous-titre",
  badge_text: "Badge",
  badge_color: "Couleur du badge",
  image_url: "Image",
  link_url: "Lien",
  cta_text: "Texte du bouton",
  price: "Prix",
  bg_gradient_from: "Dégradé (début)",
  bg_gradient_to: "Dégradé (fin)",
  content_html: null,
  display_order: "Ordre d'affichage",
  starts_at: "Début d'affichage",
  ends_at: "Fin d'affichage",
};

/** Idem pour les produits (écran d'une publication). */
const PRODUCT_REVIEW_LABELS: Record<ProductWritableColumn, string | null> = {
  category_id: "Catégorie (id)",
  name: "Nom",
  description: null,
  description_type: "Type de description",
  short_description: "Description courte",
  base_price: "Prix",
  compare_price: "Prix barré",
  sku: "SKU",
  brand: "Marque",
  is_featured: "Mis en avant (hero)",
  stock_quantity: "Stock",
  low_stock_threshold: "Seuil de stock bas",
  weight_grams: "Poids (g)",
  meta_title: "Titre SEO",
  meta_description: "Description SEO",
  tagline: "Accroche",
  highlights: "Points forts",
  feature_blocks: "Blocs de caractéristiques",
  faq: "FAQ structurée",
  faq_html: null,
};

/**
 * Libellés de la carte « Autres champs modifiés » : DÉRIVÉS des tables ci-dessus
 * (donc typés sur la liste blanche), pas une seconde table tenue à la main. La
 * seconde table avait oublié `badge_color`, `bg_gradient_*`, `starts_at` et
 * `ends_at` — écrivables, rendus en noms de colonnes bruts. Or une `ends_at`
 * passée est un retrait de fait : la relecture doit la lire en clair.
 */
function scalarLabels(labels: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(Object.entries(labels).filter((e): e is [string, string] => e[1] !== null));
}
const BANNER_SCALAR_LABELS = scalarLabels(BANNER_REVIEW_LABELS);
const PRODUCT_SCALAR_LABELS = scalarLabels(PRODUCT_REVIEW_LABELS);

function reviewFields(
  labels: Record<string, string | null>,
  row: Record<string, unknown>,
): { key: string; label: string; value: string }[] {
  return Object.entries(labels).flatMap(([key, label]) =>
    label === null ? [] : [{ key, label, value: formatScalar(key, row[key]) }],
  );
}

/**
 * Tous les champs d'une bannière, VALEURS et non différences — l'écran d'une
 * révision `create` (§ 2.7). Exportée et pure pour être testée sans rendu.
 * Aucun filtre d'égalité : un objet neuf ne « change » rien, et c'est ce
 * qu'un filtre aurait pris pour du bruit.
 */
export function bannerReviewFields(banner: Banner): { key: string; label: string; value: string }[] {
  return reviewFields(BANNER_REVIEW_LABELS, banner as unknown as Record<string, unknown>);
}

/** Champs scalaires d'une fiche telle qu'elle paraîtra — écran d'une `publish`. */
export function productReviewFields(product: ProductDetail): { key: string; label: string; value: string }[] {
  return reviewFields(PRODUCT_REVIEW_LABELS, product as unknown as Record<string, unknown>);
}

/**
 * Champs de la carte « telle qu'un client la voit maintenant » (retrait, § 2.6).
 * Cette carte est celle sur laquelle repose la relecture d'un retrait : elle ne
 * montrait pas le nom ni le prix d'un produit, ni le titre, le badge, le prix ou
 * le dégradé d'une bannière — alors que l'image d'une bannière en est le visuel
 * dominant. Les mêmes champs que l'écran d'une création/publication, pas une
 * liste de plus à tenir. Pure, exportée pour être testée sans rendu.
 */
export function currentViewFields(
  target: RevisionTarget,
  current: ProductDetail | Banner,
): { key: string; label: string; value: string }[] {
  return target === "banner" ? bannerReviewFields(current as Banner) : productReviewFields(current as ProductDetail);
}

/**
 * La bannière comme le carrousel la peint : son image sur son dégradé. Le HTML
 * libre (`BannerContentBlock`) n'en est que la superposition ; sans ceci, la
 * carte d'un retrait ne montrait pas le visuel que les quatre bannières de
 * production portent toutes (`image_url`).
 */
function BannerVisualPreview({ banner }: { banner: Banner }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Visuel</p>
      {banner.image_url ? (
        <div
          className="relative aspect-[16/6] w-full overflow-hidden rounded-lg border"
          style={{
            backgroundImage: `linear-gradient(to right, ${banner.bg_gradient_from || "#183C78"}, ${banner.bg_gradient_to || "#1E4A8F"})`,
          }}
        >
          <Image
            src={getImageUrl(banner.image_url)}
            alt={banner.title}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain"
          />
        </div>
      ) : (
        <EmptyNotice>Aucune image : la bannière ne montre que son texte sur le dégradé.</EmptyNotice>
      )}
    </div>
  );
}

function FieldsCard({ title, fields }: { title: string; fields: { key: string; label: string; value: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="rounded-lg border p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
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

function WithdrawalLines({ lines }: { lines: WithdrawalLine[] }) {
  return (
    <ul className="space-y-2">
      {lines.map((l) => (
        <li
          key={l.text}
          className={cn("text-sm", l.warning && "rounded-md border border-amber-500/40 bg-amber-500/5 p-2 font-medium")}
        >
          {l.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * Écran d'un retrait (§ 2.6) : ce qui disparaît, ce qui reste, et que c'est
 * réversible. La fiche ou la bannière s'affiche telle qu'un client la voit
 * MAINTENANT (le rendu « Actuel » des autres écrans, pas un diff : il n'y a
 * rien de proposé à comparer). Les chiffres viennent de `getWithdrawImpact`,
 * le texte de `withdrawalReading` — aucune des deux n'est recomposée ici.
 */
function WithdrawalScreen({
  target,
  targetId,
  current,
  impact,
}: {
  target: RevisionTarget;
  targetId: string;
  current: ProductDetail | Banner;
  impact: WithdrawImpact;
}) {
  const reading = withdrawalReading(impact);
  return (
    <div className="space-y-6">
      {reading.alreadyHidden && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm font-medium">
          {reading.alreadyHidden}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Ce qui disparaît pour un client</CardTitle>
          </CardHeader>
          <CardContent>
            {reading.disappears.length > 0 ? (
              <WithdrawalLines lines={reading.disappears} />
            ) : (
              <p className="text-sm text-muted-foreground">Rien : elle n&apos;est déjà plus visible.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ce qui reste, sans être modifié</CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalLines lines={reading.stays} />
          </CardContent>
        </Card>
      </div>
      <p className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm">{reading.reversible}</p>
      <FieldsCard
        title={target === "banner" ? "Champs de la bannière, tels qu'un client les voit maintenant" : "Champs de la fiche, tels qu'un client les voit maintenant"}
        fields={currentViewFields(target, current)}
      />
      <Card>
        <CardHeader>
          <CardTitle>{target === "banner" ? "La bannière telle qu'un client la voit maintenant" : "La fiche telle qu'un client la voit maintenant"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {target === "banner" ? (
            <>
              <BannerVisualPreview banner={current as Banner} />
              <BannerContentBlock contentHtml={(current as Banner).content_html} bannerId={targetId} variant="current" />
            </>
          ) : (
            <>
              <ImagesPreview images={(current as ProductDetail).images} />
              <ProductContentTabs
                descriptionSlot={
                  <DescriptionBlockCurrent
                    description={(current as ProductDetail).description}
                    descriptionType={(current as ProductDetail).description_type}
                    productId={targetId}
                  />
                }
                faqSlot={<FaqBlock faqHtml={(current as ProductDetail).faq_html} productId={targetId} variant="current" />}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * La fiche ENTIÈRE telle qu'elle paraîtra, en une colonne : ses champs, ses
 * images, sa description et sa FAQ rendues comme la vitrine, et le contrôle de
 * charte. Partagée par `publish` et `reactivate` — deux apparitions, un seul
 * écran de fiche.
 */
function ProductWholeObject({
  product,
  images,
  targetId,
  fieldsTitle,
}: {
  product: ProductDetail;
  images: ProductImage[];
  targetId: string;
  fieldsTitle: string;
}) {
  return (
    <div className="space-y-6">
      <FieldsCard title={fieldsTitle} fields={productReviewFields(product)} />
      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatPrice(product.base_price)}
            {product.brand ? ` · ${product.brand}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImagesPreview images={images} />
          <ProductContentTabs
            descriptionSlot={
              <DescriptionBlockProposed
                description={product.description}
                descriptionType={product.description_type}
                productId={targetId}
              />
            }
            faqSlot={<FaqBlock faqHtml={product.faq_html} productId={targetId} variant="proposed" />}
          />
          <ConformanceSection
            fields={[
              {
                label: "Description",
                html: productDescriptionHtml(product.description, product.description_type, targetId),
              },
              { label: "FAQ", html: productFaqHtml(product.faq_html, targetId) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Écran d'une remise en ligne (§ 2.6 bis) : d'abord ce qui rend la fiche
 * impropre à la vitrine (`reactivationReading`, mesuré par
 * `getReactivationReadiness`), puis la fiche entière. Les constats sont des
 * AVERTISSEMENTS : rien ici ne désactive « Remettre en ligne ». Aucune saisie
 * n'est demandée — une remise en ligne ratée se voit, et un retrait la corrige.
 */
function ReactivationScreen({
  product,
  targetId,
  readiness,
}: {
  product: ProductDetail;
  targetId: string;
  readiness: ReactivationReadiness;
}) {
  const reading = reactivationReading(readiness);
  return (
    <div className="space-y-6">
      {reading.notApplicable && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm font-medium">
          {reading.notApplicable}
        </p>
      )}
      {reading.warnings.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle>
              Ce qui rend cette fiche impropre à la vitrine ({reading.warnings.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Des avertissements, pas des refus : vous pouvez remettre la fiche en ligne malgré eux.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reading.warnings.map((w) => (
                <li key={w.code} className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm font-medium">
                  {w.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        reading.allClear && (
          <p className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm">{reading.allClear}</p>
        )
      )}
      <ProductWholeObject
        product={product}
        images={product.images}
        targetId={targetId}
        fieldsTitle="Champs de la fiche (la remise en ligne l'active : elle réapparaît sur la vitrine)"
      />
    </div>
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
  /** Conséquences mesurées d'un retrait (§ 2.6) — requises pour `kind: "withdraw"`. */
  impact?: WithdrawImpact | null;
  /** Constats d'une remise en ligne (§ 2.6 bis) — requis pour `kind: "reactivate"`. */
  readiness?: ReactivationReadiness | null;
}

/**
 * Écran de comparaison d'une révision : rendu, pas source (§ 2.4 du spec).
 *
 * `publish` (aucun état antérieur côté client) montre la fiche complète en
 * une colonne ; `update` montre l'actuel et le proposé côte à côte ;
 * `add_images`/`remove_image`/`set_variants` (phase 2) montrent chacune le
 * rendu dédié à leur table enfant (`AddImagesDiff`, `RemoveImageDiff`,
 * `SetVariantsDiff`) — jamais la comparaison Description/FAQ, qui n'aurait
 * rien à montrer pour ces natures-là et masquerait le vrai changement sous du
 * contenu identique des deux côtés. La décision de disposition est déléguée à
 * `revisionLayout`, seule partie de ce fichier testée pour discriminer les
 * cinq natures ; à l'intérieur du cas `"child"`, ce composant choisit encore
 * lequel des trois rendus dédiés afficher — un choix de CONTENU, pas de
 * disposition, et qui n'a donc pas sa place dans `revisionLayout`.
 *
 * Se limite volontairement aux champs qui comptent pour une relecture : le
 * HTML libre (description, FAQ, contenu de bannière), les champs texte que la
 * révision touche, les images (ajoutées, retirées, ou déjà attachées pour la
 * vue seule d'une révision `publish` — une boutique en paiement à la
 * livraison ne peut pas se permettre qu'une mise en ligne sans visuel passe
 * inaperçue), et les variantes couleur. La parité visuelle complète avec la
 * fiche boutique (galerie, carrousel, avis) reste hors périmètre de cette
 * tâche.
 */
export function RevisionDiff({ target, kind, targetId, current, payload, impact, readiness }: RevisionDiffProps) {
  const layout = revisionLayout(kind);

  if (layout === "withdrawal") {
    // Jamais un écran vide au-dessus du bouton Appliquer : sans mesure, on le
    // dit, et on ne laisse pas croire qu'il n'y a rien à perdre.
    if (!impact) {
      return (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Les conséquences de ce retrait n&apos;ont pas pu être mesurées. N&apos;appliquez pas cette révision avant
          d&apos;avoir rechargé la page.
        </p>
      );
    }
    return <WithdrawalScreen target={target} targetId={targetId} current={current} impact={impact} />;
  }

  if (layout === "reactivation") {
    // Une remise en ligne ne s'applique qu'à un produit (`assertValidPayload`) ; sans mesure,
    // on le dit plutôt que de montrer une fiche sans ses défauts.
    if (target !== "product" || !readiness) {
      return (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          Les constats de cette remise en ligne n&apos;ont pas pu être mesurés. Ne l&apos;appliquez pas avant d&apos;avoir
          rechargé la page.
        </p>
      );
    }
    return <ReactivationScreen product={current as ProductDetail} targetId={targetId} readiness={readiness} />;
  }

  if (target === "banner") {
    const currentBanner = current as Banner;
    const proposedBanner: Banner = { ...currentBanner, ...(payload as Partial<Banner>) };

    if (layout === "single") {
      return (
        <div className="space-y-6">
          <FieldsCard title="Champs de la bannière (la création l'active : elle entre au carrousel)" fields={bannerReviewFields(proposedBanner)} />
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

    // "side-by-side" : seul autre cas pour une bannière — `assertValidPayload`
    // (lib/db/revisions.ts) réserve `add_images`/`remove_image`/`set_variants`
    // à `target: "product"`, donc `layout` ne vaut jamais `"child"` ici.
    const scalarChanges = changedScalarFields(target, currentBanner as unknown as Record<string, unknown>, payload);
    const dateWarning = dateWithdrawalWarning(currentBanner, payload, bannerClock());
    return (
      <div className="space-y-6">
        {dateWarning && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium">
            {dateWarning}
          </p>
        )}
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

  if (layout === "child") {
    // `payload` ne porte ici ni colonne de `products` ni HTML libre (images ou
    // variantes seulement) : pas de `proposedProduct` à construire, il n'y a
    // rien à fusionner avec `currentProduct` pour ces trois natures.
    return (
      <div className="space-y-6">
        {kind === "add_images" && <AddImagesDiff current={currentProduct} payload={payload} />}
        {kind === "remove_image" && <RemoveImageDiff current={currentProduct} payload={payload} />}
        {kind === "set_variants" && <SetVariantsDiff current={currentProduct} payload={payload} />}
      </div>
    );
  }

  const proposedProduct: ProductDetail = { ...currentProduct, ...(payload as Partial<ProductDetail>) };

  if (layout === "single") {
    return (
      <ProductWholeObject
        product={proposedProduct}
        images={currentProduct.images}
        targetId={targetId}
        fieldsTitle="Champs de la fiche (la publication lève le brouillon et l'active)"
      />
    );
  }

  // "side-by-side" : seul autre cas atteignable ici pour un produit — la
  // branche `"child"` est retournée plus haut, avant la construction de
  // `proposedProduct`.
  const scalarChanges = changedScalarFields(target, currentProduct as unknown as Record<string, unknown>, payload);
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
