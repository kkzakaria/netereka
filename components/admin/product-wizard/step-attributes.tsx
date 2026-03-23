// components/admin/product-wizard/step-attributes.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/admin/color-picker";
import type { ProductDetail } from "@/lib/db/types";

interface StepAttributesProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
}

type ColorEntry = { uid: string; name: string; hex: string };
type AttrRow = { uid: string; name: string; value: string };

const FIXED_KEYS = new Set(["Longueur", "Hauteur", "Largeur", "Poids", "Couleur"]);

const PRESET_COLORS = [
  { name: "Noir",        hex: "#1a1a1a" },
  { name: "Blanc",       hex: "#f5f5f5" },
  { name: "Gris",        hex: "#9e9e9e" },
  { name: "Argent",      hex: "#c0c0c0" },
  { name: "Or",          hex: "#d4a847" },
  { name: "Or rose",     hex: "#e8b4b8" },
  { name: "Titane",      hex: "#878781" },
  { name: "Bleu",        hex: "#1565c0" },
  { name: "Bleu nuit",   hex: "#1a237e" },
  { name: "Rouge",       hex: "#c62828" },
  { name: "Vert",        hex: "#2e7d32" },
  { name: "Violet",      hex: "#6a1b9a" },
  { name: "Orange",      hex: "#e65100" },
  { name: "Jaune",       hex: "#f9a825" },
];

const FIXED_DIMS = [
  { key: "Longueur", unit: "mm" },
  { key: "Hauteur", unit: "mm" },
  { key: "Largeur", unit: "mm" },
  { key: "Poids", unit: "g" },
];

/** Stored as "Nom|#hexcode". Falls back gracefully for legacy plain-name entries. */
function parseColorValue(raw: string): { name: string; hex: string } {
  const idx = raw.lastIndexOf("|");
  if (idx !== -1 && raw[idx + 1] === "#") {
    return { name: raw.slice(0, idx), hex: raw.slice(idx + 1) };
  }
  return { name: raw, hex: "#000000" };
}

export function StepAttributes({ product, formRef, isPending }: StepAttributesProps) {
  const [colors, setColors] = useState<ColorEntry[]>(() =>
    product.attributes
      .filter((a) => a.name === "Couleur")
      .map((a) => ({ uid: a.id, ...parseColorValue(a.value) })),
  );
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#000000");

  const [fixed, setFixed] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const d of FIXED_DIMS) {
      const existing = product.attributes.find((a) => a.name === d.key);
      map[d.key] = existing?.value ?? "";
    }
    return map;
  });

  const [extras, setExtras] = useState<AttrRow[]>(() =>
    product.attributes
      .filter((a) => !FIXED_KEYS.has(a.name))
      .map((a) => ({ uid: a.id, name: a.name, value: a.value })),
  );

  function addColor(name?: string, hex?: string) {
    const n = (name ?? newName).trim();
    const h = hex ?? newHex;
    if (!n) return;
    if (!colors.some((c) => c.name === n)) {
      setColors((prev) => [...prev, { uid: crypto.randomUUID(), name: n, hex: h }]);
    }
    if (!name) {
      setNewName("");
      setNewHex("#000000");
    }
  }

  function removeColor(uid: string) {
    setColors((prev) => prev.filter((c) => c.uid !== uid));
  }

  function addExtra() {
    setExtras((prev) => [...prev, { uid: crypto.randomUUID(), name: "", value: "" }]);
  }

  function removeExtra(uid: string) {
    setExtras((prev) => prev.filter((a) => a.uid !== uid));
  }

  function updateExtra(uid: string, field: "name" | "value", val: string) {
    setExtras((prev) => prev.map((a) => (a.uid === uid ? { ...a, [field]: val } : a)));
  }

  const serialized = JSON.stringify([
    ...colors.map((c) => ({ name: "Couleur", value: `${c.name}|${c.hex}` })),
    ...FIXED_DIMS.filter((d) => fixed[d.key]?.trim()).map((d) => ({
      name: d.key,
      value: fixed[d.key].trim(),
    })),
    ...extras
      .filter((a) => a.name.trim())
      .map((a) => ({ name: a.name.trim(), value: a.value.trim() })),
  ]);

  return (
    <form ref={formRef} className="space-y-6">
      <input type="hidden" name="_step" value="2" />
      <input type="hidden" name="attributes" value={serialized} />

      {/* Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Couleurs disponibles</h3>
        <p className="text-xs text-muted-foreground">
          Sélectionnez toutes les couleurs dans lesquelles ce produit est disponible. Utilisez les
          raccourcis ci-dessous ou définissez une couleur personnalisée avec le sélecteur.
        </p>

        {/* Preset swatches */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => {
            const active = colors.some((c) => c.name === p.name);
            return (
              <button
                key={p.name}
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (active) {
                    setColors((prev) => prev.filter((c) => c.name !== p.name));
                  } else {
                    addColor(p.name, p.hex);
                  }
                }}
                title={p.name}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="size-3 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: p.hex }}
                />
                {p.name}
              </button>
            );
          })}
        </div>

        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <span
                key={c.uid}
                className="flex items-center gap-2 rounded-full border bg-muted pl-1.5 pr-3 py-1 text-sm"
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeColor(c.uid)}
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                  aria-label={`Retirer ${c.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <ColorPicker
            value={newHex}
            onChange={setNewHex}
            className="w-36 shrink-0"
          />
          <Input
            value={newName}
            disabled={isPending}
            placeholder="Nom (ex: Noir, Bleu nuit…)"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={isPending} onClick={() => addColor()}>
            Ajouter
          </Button>
        </div>
      </div>

      {/* Fixed dimensions & weight */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Dimensions &amp; Poids</h3>
        <div className="grid grid-cols-2 gap-3">
          {FIXED_DIMS.map((d) => (
            <div key={d.key} className="space-y-1.5">
              <Label htmlFor={`fixed-${d.key}`} className="text-xs">
                {d.key}{" "}
                <span className="text-muted-foreground">({d.unit})</span>
              </Label>
              <Input
                id={`fixed-${d.key}`}
                type="number"
                min={0}
                step="any"
                value={fixed[d.key]}
                onChange={(e) => setFixed((prev) => ({ ...prev, [d.key]: e.target.value }))}
                disabled={isPending}
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Extra free-form attributes */}
      {extras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Autres caractéristiques</h3>
          {extras.map((attr) => (
            <div key={attr.uid} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
              <Input
                value={attr.name}
                onChange={(e) => updateExtra(attr.uid, "name", e.target.value)}
                disabled={isPending}
                placeholder="ex: Écran"
              />
              <Input
                value={attr.value}
                onChange={(e) => updateExtra(attr.uid, "value", e.target.value)}
                disabled={isPending}
                placeholder='ex: 6.7" AMOLED'
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => removeExtra(attr.uid)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Supprimer"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={addExtra}
      >
        + Ajouter une caractéristique
      </Button>
    </form>
  );
}
