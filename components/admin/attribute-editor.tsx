"use client";

import { useCallback, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

const PREDEFINED_COLORS = [
  { name: "Noir", hex: "#000000" },
  { name: "Blanc", hex: "#FFFFFF" },
  { name: "Bleu", hex: "#2563EB" },
  { name: "Rouge", hex: "#DC2626" },
  { name: "Vert", hex: "#16A34A" },
  { name: "Rose", hex: "#EC4899" },
  { name: "Violet", hex: "#7C3AED" },
  { name: "Gris", hex: "#6B7280" },
  { name: "Or", hex: "#D97706" },
  { name: "Argent", hex: "#9CA3AF" },
] as const;

const PREDEFINED_STORAGE = [
  "32 Go", "64 Go", "128 Go", "256 Go", "512 Go", "1 To", "2 To",
] as const;

const PREDEFINED_RAM = [
  "2 Go", "3 Go", "4 Go", "6 Go", "8 Go", "12 Go", "16 Go", "32 Go",
] as const;

const PREDEFINED_ATTRIBUTES = [
  { label: "Couleur", value: "color" },
  { label: "Stockage", value: "storage" },
  { label: "RAM", value: "ram" },
] as const;

function getLabelForKey(key: string): string {
  return PREDEFINED_ATTRIBUTES.find((a) => a.value === key)?.label ?? key;
}

interface AttributePair {
  id: number;
  key: string;
  value: string;
  custom: boolean;
}

function parseAttributes(
  json: string | undefined | null
): { pairs: AttributePair[]; nextId: number } {
  if (!json) return { pairs: [], nextId: 0 };
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== "object" || obj === null) return { pairs: [], nextId: 0 };
    let id = 0;
    const pairs = Object.entries(obj).map(([key, val]) => ({
      id: ++id,
      key,
      value: String(val),
      custom: !PREDEFINED_ATTRIBUTES.some((a) => a.value === key),
    }));
    return { pairs, nextId: id };
  } catch {
    return { pairs: [], nextId: 0 };
  }
}

function serializeAttributes(pairs: AttributePair[]): string {
  const obj: Record<string, string> = {};
  for (const pair of pairs) {
    const k = pair.key.trim();
    const v = pair.value.trim();
    if (k && v) obj[k] = v;
  }
  return JSON.stringify(obj);
}

/** Parse a stored color value: "Bleu" or "Corail:#FF5733" */
function parseColorValue(stored: string): { name: string; hex: string | null } {
  const idx = stored.lastIndexOf(":#");
  if (idx > 0 && stored.length - idx <= 8) {
    return { name: stored.slice(0, idx), hex: stored.slice(idx + 1) };
  }
  return { name: stored, hex: null };
}

function ColorValueInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const parsed = parseColorValue(value);
  const predefined = PREDEFINED_COLORS.find((c) => c.name === parsed.name);
  const isCustom = !!value && !predefined;

  const [showCustom, setShowCustom] = useState(() => isCustom);
  const [customHex, setCustomHex] = useState(parsed.hex ?? "#000000");

  const displayName = parsed.name;
  const displayHex = predefined?.hex ?? parsed.hex ?? customHex;

  const handleSwatchClick = useCallback(
    (name: string) => {
      setShowCustom(false);
      onChange(name);
    },
    [onChange]
  );

  const handleCustomToggle = useCallback(() => {
    setShowCustom(true);
    // Keep current custom hex as value so the attribute isn't empty
    onChange(`Personnalisé:${customHex}`);
  }, [onChange, customHex]);

  function handleCustomNameChange(name: string) {
    onChange(name ? `${name}:${customHex}` : "");
  }

  function handleCustomHexChange(hex: string) {
    setCustomHex(hex);
    const name = displayName || "Personnalisé";
    onChange(`${name}:${hex}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {PREDEFINED_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            title={color.name}
            onClick={() => handleSwatchClick(color.name)}
            className={`relative size-8 rounded-full transition-shadow ${
              displayName === color.name && !showCustom
                ? "ring-2 ring-primary ring-offset-2"
                : "hover:ring-1 hover:ring-muted-foreground"
            }`}
            aria-label={`Couleur ${color.name}`}
          >
            <span
              className="absolute inset-1 rounded-full border border-border shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
          </button>
        ))}
        <button
          type="button"
          title="Personnalisé"
          onClick={handleCustomToggle}
          className={`flex size-8 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground transition-shadow ${
            showCustom
              ? "ring-2 ring-primary ring-offset-2"
              : "hover:ring-1 hover:ring-muted-foreground"
          }`}
          aria-label="Couleur personnalisée"
        >
          +
        </button>
        {value && (
          <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block size-3.5 rounded-full border border-border"
              style={{ backgroundColor: displayHex }}
            />
            {displayName}
          </span>
        )}
      </div>
      {showCustom && (
        <div className="flex flex-col gap-2">
          <HexColorPicker
            color={customHex}
            onChange={handleCustomHexChange}
            style={{ width: "100%", height: 150 }}
          />
          <div className="flex items-center gap-2">
            <span
              className="size-8 shrink-0 rounded border border-border"
              style={{ backgroundColor: customHex }}
            />
            <Input
              placeholder="Nom (ex: Turquoise)"
              value={displayName}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              className="flex-1"
              aria-label="Nom de la couleur personnalisée"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChipValueInput({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [showCustom, setShowCustom] = useState(
    () => !!value && !options.includes(value)
  );

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange(opt);
            }}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              value === opt
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted"
            }`}
            aria-label={`${label} ${opt}`}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setShowCustom(true);
            onChange("");
          }}
          className={`rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors ${
            showCustom
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"
          }`}
          aria-label={`${label} personnalisé`}
        >
          Autre
        </button>
      </div>
      {showCustom && (
        <Input
          placeholder={`Ex: 24 Go`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Valeur personnalisée ${label}`}
        />
      )}
    </div>
  );
}

interface AttributeEditorProps {
  defaultValue?: string | null;
}

export function AttributeEditor({ defaultValue }: AttributeEditorProps) {
  const [{ pairs }, setData] = useState(() => {
    const parsed = parseAttributes(defaultValue);
    return { pairs: parsed.pairs, nextId: parsed.nextId };
  });

  function setPairs(updater: (prev: AttributePair[]) => AttributePair[]) {
    setData((prev) => ({ ...prev, pairs: updater(prev.pairs) }));
  }

  function addPair() {
    setData((prev) => ({
      nextId: prev.nextId + 1,
      pairs: [
        ...prev.pairs,
        { id: prev.nextId + 1, key: "", value: "", custom: false },
      ],
    }));
  }

  function removePair(id: number) {
    setPairs((prev) => prev.filter((p) => p.id !== id));
  }

  function updateKey(id: number, newKey: string) {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: newKey, custom: false } : p))
    );
  }

  function setCustomKey(id: number) {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: "", custom: true } : p))
    );
  }

  function resetToSelect(id: number) {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: "", custom: false } : p))
    );
  }

  function updateCustomKey(id: number, newKey: string) {
    setPairs((prev) => {
      const conflict = prev.some((p) => p.id !== id && p.key === newKey && newKey !== "");
      if (conflict) return prev;
      return prev.map((p) => (p.id === id ? { ...p, key: newKey } : p));
    });
  }

  function updateValue(id: number, newValue: string) {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newValue } : p))
    );
  }

  const usedKeys = useMemo(() => pairs.map((p) => p.key), [pairs]);

  return (
    <fieldset className="space-y-2">
      <Label asChild>
        <legend>Attributs</legend>
      </Label>
      {pairs.map((pair, index) => {
        const keyLabel = getLabelForKey(pair.key) || `#${index + 1}`;
        return (
          <div key={pair.id} className="flex items-center gap-2">
            {pair.custom ? (
              <div className="flex flex-1 items-center gap-1">
                <Input
                  placeholder="Clé"
                  value={pair.key}
                  onChange={(e) => updateCustomKey(pair.id, e.target.value)}
                  aria-label={`Clé personnalisée de l'attribut ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => resetToSelect(pair.id)}
                  aria-label="Revenir à la liste prédéfinie"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} />
                </Button>
              </div>
            ) : (
              <Select
                value={pair.key}
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    setCustomKey(pair.id);
                  } else {
                    updateKey(pair.id, val);
                  }
                }}
              >
                <SelectTrigger
                  className="flex-1 h-9"
                  aria-label={`Type de l'attribut ${index + 1}`}
                >
                  <SelectValue placeholder="Attribut" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ATTRIBUTES.map((attr) => (
                    <SelectItem
                      key={attr.value}
                      value={attr.value}
                      disabled={
                        usedKeys.includes(attr.value) && pair.key !== attr.value
                      }
                    >
                      {attr.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Personnalisé…</SelectItem>
                </SelectContent>
              </Select>
            )}
            {pair.key === "color" ? (
              <ColorValueInput
                value={pair.value}
                onChange={(val) => updateValue(pair.id, val)}
              />
            ) : pair.key === "storage" ? (
              <ChipValueInput
                options={PREDEFINED_STORAGE}
                value={pair.value}
                onChange={(val) => updateValue(pair.id, val)}
                label="Stockage"
              />
            ) : pair.key === "ram" ? (
              <ChipValueInput
                options={PREDEFINED_RAM}
                value={pair.value}
                onChange={(val) => updateValue(pair.id, val)}
                label="RAM"
              />
            ) : (
              <Input
                placeholder="Valeur"
                value={pair.value}
                onChange={(e) => updateValue(pair.id, e.target.value)}
                aria-label={`Valeur de l'attribut ${keyLabel}`}
                className="flex-1"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => removePair(pair.id)}
              aria-label={`Supprimer l'attribut ${keyLabel}`}
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPair}
        className="w-full"
      >
        <HugeiconsIcon icon={Add01Icon} size={16} />
        Ajouter un attribut
      </Button>
      <input type="hidden" name="attributes" value={serializeAttributes(pairs)} />
    </fieldset>
  );
}
