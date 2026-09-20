// components/admin/product-wizard/step-finalization.tsx
"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ConformanceNotices } from "@/components/admin/conformance-notices";
import type { ProductDetail } from "@/lib/db/types";

const HtmlEditor = dynamic(
  () => import("@/components/admin/html-editor").then((m) => m.HtmlEditor),
);

interface StepFinalizationProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

export function StepFinalization({
  product,
  formRef,
  isPending,
}: StepFinalizationProps) {
  const [metaTitleLen, setMetaTitleLen] = useState(
    (product.meta_title ?? "").length,
  );
  const [metaDescLen, setMetaDescLen] = useState(
    (product.meta_description ?? "").length,
  );
  const isActiveRef = useRef<HTMLInputElement>(null);
  const isFeaturedRef = useRef<HTMLInputElement>(null);
  const [faqHtml, setFaqHtml] = useState(product.faq_html ?? "");
  // Voir le commentaire identique dans product-form-sections.tsx : un
  // brouillon "richtext" mais vide n'a rien à perdre et rejoint le cas
  // normal ; seul un JSON Lexical non vide reste hors de portée de
  // l'éditeur HTML brut.
  const isLegacyRichText =
    product.description_type !== "html" &&
    !!(product.description && product.description.trim());
  const [descriptionHtml, setDescriptionHtml] = useState(
    isLegacyRichText ? "" : product.description ?? "",
  );

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="5" />

      {/* Hidden inputs: all fields required by updateProduct that aren't in this step */}
      <input type="hidden" name="slug" value={product.slug} />
      <input type="hidden" name="name" value={product.name} />
      <input type="hidden" name="category_id" value={product.category_id ?? ""} />
      <input type="hidden" name="base_price" value={product.base_price} />
      <input type="hidden" name="stock_quantity" value={product.stock_quantity} />
      <input
        type="hidden"
        name="low_stock_threshold"
        value={product.low_stock_threshold}
      />
      {product.brand && (
        <input type="hidden" name="brand" value={product.brand} />
      )}
      {product.sku && <input type="hidden" name="sku" value={product.sku} />}
      {product.compare_price != null && (
        <input
          type="hidden"
          name="compare_price"
          value={product.compare_price}
        />
      )}
      {product.weight_grams != null && (
        <input
          type="hidden"
          name="weight_grams"
          value={product.weight_grams}
        />
      )}

      {/* Résumé court */}
      <div className="space-y-1.5">
        <Label htmlFor="wiz-short-desc">Résumé court</Label>
        <Input
          id="wiz-short-desc"
          name="short_description"
          disabled={isPending}
          defaultValue={product.short_description ?? ""}
          placeholder="ex: Smartphone 128Go avec triple caméra 50MP"
        />
      </div>

      {/* Description */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Description</h3>
        {isLegacyRichText ? (
          <>
            <p className="text-sm text-muted-foreground">
              Cette description a été rédigée avec l&apos;ancien éditeur riche
              (JSON) et continue de s&apos;afficher normalement sur la fiche.
              L&apos;éditeur HTML ci-dessous ne peut pas l&apos;ouvrir sans
              afficher ce JSON comme du texte brut — elle n&apos;est donc pas
              modifiable depuis cette interface pour le moment. Les outils MCP
              n&apos;y ont pas non plus accès : ils n&apos;écrivent que des
              brouillons, et ce produit est déjà publié.
            </p>
            <input type="hidden" name="description" value={product.description ?? ""} />
            <input
              type="hidden"
              name="description_type"
              value={product.description_type ?? "richtext"}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Affichée dans l&apos;onglet Description de la fiche. Emploie le
              vocabulaire <code>nk-</code> de la charte (<code>nk-section</code>,{" "}
              <code>nk-container</code>…).
            </p>
            <HtmlEditor
              name="description"
              defaultValue={product.description ?? ""}
              onContentChange={setDescriptionHtml}
            />
            <ConformanceNotices html={descriptionHtml} />
            <input type="hidden" name="description_type" value="html" />
          </>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">FAQ</h3>
        <p className="text-sm text-muted-foreground">
          Affichée dans son propre onglet sur la fiche. Emploie{" "}
          <code>&lt;details&gt;</code> et <code>&lt;summary&gt;</code> dans un{" "}
          <code>&lt;div class=&quot;nk-faq&quot;&gt;</code> pour l&apos;accordéon.
        </p>
        <HtmlEditor
          name="faq_html"
          defaultValue={product.faq_html ?? ""}
          onContentChange={setFaqHtml}
        />
        <ConformanceNotices html={faqHtml} />
      </div>

      {/* SEO */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">SEO</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="wiz-meta-title">Titre SEO</Label>
            <span
              className={`text-xs tabular-nums ${metaTitleLen > 55 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {metaTitleLen}/60
            </span>
          </div>
          <Input
            id="wiz-meta-title"
            name="meta_title"
            maxLength={60}
            disabled={isPending}
            defaultValue={product.meta_title ?? ""}
            placeholder="Titre pour les moteurs de recherche"
            onChange={(e) => setMetaTitleLen(e.target.value.length)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="wiz-meta-desc">Meta description</Label>
            <span
              className={`text-xs tabular-nums ${metaDescLen > 140 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {metaDescLen}/160
            </span>
          </div>
          <Textarea
            id="wiz-meta-desc"
            name="meta_description"
            rows={3}
            maxLength={160}
            disabled={isPending}
            defaultValue={product.meta_description ?? ""}
            placeholder="Description pour les moteurs de recherche"
            onChange={(e) => setMetaDescLen(e.target.value.length)}
          />
        </div>
      </div>

      {/* Visibilité */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Visibilité</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Publier immédiatement</Label>
            <p className="text-xs text-muted-foreground">
              Visible sur la boutique dès la publication
            </p>
          </div>
          <input
            type="hidden"
            name="is_active"
            ref={isActiveRef}
            defaultValue={product.is_active}
          />
          <Switch
            defaultChecked={product.is_active === 1}
            onCheckedChange={(checked) => {
              if (isActiveRef.current)
                isActiveRef.current.value = checked ? "1" : "0";
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Mettre en avant</Label>
            <p className="text-xs text-muted-foreground">
              Affiché dans la section vedette de la page d&apos;accueil
            </p>
          </div>
          <input
            type="hidden"
            name="is_featured"
            ref={isFeaturedRef}
            defaultValue={product.is_featured}
          />
          <Switch
            defaultChecked={product.is_featured === 1}
            onCheckedChange={(checked) => {
              if (isFeaturedRef.current)
                isFeaturedRef.current.value = checked ? "1" : "0";
            }}
          />
        </div>
      </div>
    </form>
  );
}
