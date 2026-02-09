"use client";

import { useMemo, useRef, useState } from "react";
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

let nextId = 0;

function parseAttributes(json: string | undefined | null): AttributePair[] {
  if (!json) return [];
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== "object" || obj === null) return [];
    return Object.entries(obj).map(([key, val]) => ({
      id: ++nextId,
      key,
      value: String(val),
      custom: !PREDEFINED_ATTRIBUTES.some((a) => a.value === key),
    }));
  } catch {
    return [];
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

interface AttributeEditorProps {
  defaultValue?: string | null;
}

export function AttributeEditor({ defaultValue }: AttributeEditorProps) {
  const idCounter = useRef(nextId);
  const [pairs, setPairs] = useState<AttributePair[]>(() =>
    parseAttributes(defaultValue)
  );

  function addPair() {
    idCounter.current += 1;
    setPairs((prev) => [
      ...prev,
      { id: idCounter.current, key: "", value: "", custom: false },
    ]);
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
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: newKey } : p))
    );
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
            <Input
              placeholder="Valeur"
              value={pair.value}
              onChange={(e) => updateValue(pair.id, e.target.value)}
              aria-label={`Valeur de l'attribut ${keyLabel}`}
              className="flex-1"
            />
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
