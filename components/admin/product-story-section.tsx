"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StoryIconPicker } from "./story-icon-picker";
import { StoryFeatureBlockEditor } from "./story-feature-block-editor";
import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

interface ProductStorySectionProps {
  productId: string;
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  featureBlocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
}

const MIN_HL = 3;
const MAX_HL = 6;
const MIN_FB = 2;
const MAX_FB = 4;
const MAX_FAQ = 5;
const DEFAULT_ICON = HIGHLIGHT_ICON_NAMES[0];

export function ProductStorySection({
  productId,
  tagline: initialTagline,
  highlights: initialHighlights,
  featureBlocks: initialFeatureBlocks,
  faq: initialFaq,
}: ProductStorySectionProps) {
  const [tagline, setTagline] = useState<string>(initialTagline ?? "");
  const [highlights, setHighlights] = useState<ProductHighlight[]>(
    () => initialHighlights ?? [],
  );
  const [featureBlocks, setFeatureBlocks] = useState<ProductFeatureBlock[]>(
    () => initialFeatureBlocks ?? [],
  );
  const [faq, setFaq] = useState<ProductFaqItem[]>(() => initialFaq ?? []);

  // Serialized hidden-input values sent with the main form submit.
  const hiddenValues = useMemo(
    () => ({
      tagline: tagline.trim(),
      highlights_json:
        highlights.length === 0 ? "" : JSON.stringify(highlights),
      feature_blocks_json:
        featureBlocks.length === 0 ? "" : JSON.stringify(featureBlocks),
      faq_json: faq.length === 0 ? "" : JSON.stringify(faq),
    }),
    [tagline, highlights, featureBlocks, faq],
  );

  return (
    <div className="space-y-8">
      <input type="hidden" name="tagline" value={hiddenValues.tagline} />
      <input type="hidden" name="highlights" value={hiddenValues.highlights_json} />
      <input type="hidden" name="feature_blocks" value={hiddenValues.feature_blocks_json} />
      <input type="hidden" name="faq" value={hiddenValues.faq_json} />

      {/* Tagline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="story-tagline">Accroche</Label>
          <span className="text-xs text-muted-foreground">{tagline.length}/200</span>
        </div>
        <Textarea
          id="story-tagline"
          rows={2}
          value={tagline}
          maxLength={200}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Ex. Un écran plus grand, une autonomie qui dure."
        />
      </div>

      {/* Highlights */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Points forts</Label>
          <p className="text-xs text-muted-foreground">
            Entre {MIN_HL} et {MAX_HL} — ou laisse vide pour masquer ce bloc
          </p>
        </div>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <StoryIconPicker
                value={h.icon}
                onChange={(icon) => {
                  setHighlights((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, icon } : x)),
                  );
                }}
              />
              <Input
                value={h.label}
                maxLength={80}
                placeholder="Ex. Charge rapide 33 W"
                onChange={(e) => {
                  const label = e.target.value;
                  setHighlights((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, label } : x)),
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer le point fort"
                onClick={() => setHighlights((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={highlights.length >= MAX_HL}
          onClick={() => setHighlights((prev) => [...prev, { icon: DEFAULT_ICON, label: "" }])}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter un point fort
        </Button>
        {highlights.length > 0 && highlights.length < MIN_HL && (
          <p className="text-xs text-destructive">
            Ajoute au moins {MIN_HL} points forts ou supprime-les tous pour masquer le bloc.
          </p>
        )}
      </div>

      {/* Feature blocks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Feature blocks</Label>
          <p className="text-xs text-muted-foreground">
            Entre {MIN_FB} et {MAX_FB} — ou laisse vide pour masquer ce bloc
          </p>
        </div>
        <div className="space-y-3">
          {featureBlocks.map((block, i) => (
            <StoryFeatureBlockEditor
              key={i}
              productId={productId}
              block={block}
              index={i}
              canRemove={featureBlocks.length > 0}
              onChange={(next) =>
                setFeatureBlocks((prev) => prev.map((x, idx) => (idx === i ? next : x)))
              }
              onRemove={() =>
                setFeatureBlocks((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={featureBlocks.length >= MAX_FB}
          onClick={() =>
            setFeatureBlocks((prev) => [...prev, { title: "", body: "" }])
          }
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter un bloc
        </Button>
        {featureBlocks.length > 0 && featureBlocks.length < MIN_FB && (
          <p className="text-xs text-destructive">
            Ajoute au moins {MIN_FB} blocs ou supprime-les tous pour masquer le bloc.
          </p>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>FAQ</Label>
          <p className="text-xs text-muted-foreground">Jusqu&apos;à {MAX_FAQ} questions</p>
        </div>
        <div className="space-y-3">
          {faq.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Question {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer la question"
                  onClick={() => setFaq((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </Button>
              </div>
              <Input
                value={item.question}
                maxLength={160}
                placeholder="La question"
                onChange={(e) => {
                  const question = e.target.value;
                  setFaq((prev) => prev.map((x, idx) => (idx === i ? { ...x, question } : x)));
                }}
              />
              <Textarea
                value={item.answer}
                rows={3}
                maxLength={600}
                placeholder="La réponse"
                onChange={(e) => {
                  const answer = e.target.value;
                  setFaq((prev) => prev.map((x, idx) => (idx === i ? { ...x, answer } : x)));
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={faq.length >= MAX_FAQ}
          onClick={() => setFaq((prev) => [...prev, { question: "", answer: "" }])}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter une question
        </Button>
      </div>
    </div>
  );
}
