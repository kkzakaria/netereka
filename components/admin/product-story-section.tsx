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
import { HIGHLIGHT_ICON_NAMES, type HighlightIconName } from "@/lib/validations/product-story";

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
const DEFAULT_ICON: HighlightIconName = HIGHLIGHT_ICON_NAMES[0];

type Row<T> = { uid: string; data: T };

function newUid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function wrapRows<T>(items: T[] | null): Row<T>[] {
  return (items ?? []).map((data) => ({ uid: newUid(), data }));
}

function stripRows<T>(rows: Row<T>[]): T[] {
  return rows.map((r) => r.data);
}

export function ProductStorySection({
  productId,
  tagline: initialTagline,
  highlights: initialHighlights,
  featureBlocks: initialFeatureBlocks,
  faq: initialFaq,
}: ProductStorySectionProps) {
  const [tagline, setTagline] = useState<string>(initialTagline ?? "");
  const [highlights, setHighlights] = useState<Row<ProductHighlight>[]>(() =>
    wrapRows(initialHighlights),
  );
  const [featureBlocks, setFeatureBlocks] = useState<Row<ProductFeatureBlock>[]>(
    () => wrapRows(initialFeatureBlocks),
  );
  const [faq, setFaq] = useState<Row<ProductFaqItem>[]>(() => wrapRows(initialFaq));

  // Serialized hidden-input values sent with the main form submit.
  const hiddenValues = useMemo(
    () => ({
      tagline: tagline.trim(),
      highlights_json:
        highlights.length === 0 ? "" : JSON.stringify(stripRows(highlights)),
      feature_blocks_json:
        featureBlocks.length === 0 ? "" : JSON.stringify(stripRows(featureBlocks)),
      faq_json: faq.length === 0 ? "" : JSON.stringify(stripRows(faq)),
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
          {highlights.map((row) => (
            <div key={row.uid} className="flex items-center gap-2">
              <StoryIconPicker
                value={row.data.icon as HighlightIconName}
                onChange={(icon) => {
                  setHighlights((prev) =>
                    prev.map((x) =>
                      x.uid === row.uid ? { ...x, data: { ...x.data, icon } } : x,
                    ),
                  );
                }}
              />
              <Input
                value={row.data.label}
                maxLength={80}
                placeholder="Ex. Charge rapide 33 W"
                onChange={(e) => {
                  const label = e.target.value;
                  setHighlights((prev) =>
                    prev.map((x) =>
                      x.uid === row.uid ? { ...x, data: { ...x.data, label } } : x,
                    ),
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-touch"
                aria-label="Supprimer le point fort"
                onClick={() =>
                  setHighlights((prev) => prev.filter((x) => x.uid !== row.uid))
                }
              >
                <HugeiconsIcon icon={Delete02Icon} size={20} />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={highlights.length >= MAX_HL}
          onClick={() =>
            setHighlights((prev) => [
              ...prev,
              { uid: newUid(), data: { icon: DEFAULT_ICON, label: "" } },
            ])
          }
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
          {featureBlocks.map((row, i) => (
            <StoryFeatureBlockEditor
              key={row.uid}
              productId={productId}
              block={row.data}
              index={i}
              canRemove={featureBlocks.length > 0}
              onChange={(next) =>
                setFeatureBlocks((prev) =>
                  prev.map((x) => (x.uid === row.uid ? { ...x, data: next } : x)),
                )
              }
              onRemove={() =>
                setFeatureBlocks((prev) => prev.filter((x) => x.uid !== row.uid))
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
            setFeatureBlocks((prev) => [
              ...prev,
              { uid: newUid(), data: { title: "", body: "" } },
            ])
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
          {faq.map((row, i) => (
            <div key={row.uid} className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Question {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-touch"
                  aria-label="Supprimer la question"
                  onClick={() =>
                    setFaq((prev) => prev.filter((x) => x.uid !== row.uid))
                  }
                >
                  <HugeiconsIcon icon={Delete02Icon} size={20} />
                </Button>
              </div>
              <Input
                value={row.data.question}
                maxLength={160}
                placeholder="La question"
                onChange={(e) => {
                  const question = e.target.value;
                  setFaq((prev) =>
                    prev.map((x) =>
                      x.uid === row.uid ? { ...x, data: { ...x.data, question } } : x,
                    ),
                  );
                }}
              />
              <Textarea
                value={row.data.answer}
                rows={3}
                maxLength={600}
                placeholder="La réponse"
                onChange={(e) => {
                  const answer = e.target.value;
                  setFaq((prev) =>
                    prev.map((x) =>
                      x.uid === row.uid ? { ...x, data: { ...x.data, answer } } : x,
                    ),
                  );
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
          onClick={() =>
            setFaq((prev) => [
              ...prev,
              { uid: newUid(), data: { question: "", answer: "" } },
            ])
          }
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter une question
        </Button>
      </div>
    </div>
  );
}
