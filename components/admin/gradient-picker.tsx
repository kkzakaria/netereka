"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBannerGradient, deleteBannerGradient } from "@/actions/admin/banners";
import type { BannerGradient } from "@/lib/db/types";

interface GradientPickerProps {
  colorFrom: string;
  colorTo: string;
  savedGradients: BannerGradient[];
  onChange: (from: string, to: string) => void;
  onGradientSaved: (gradient: BannerGradient) => void;
  onGradientDeleted: (id: number) => void;
}

const BUILTIN_PRESETS = [
  { label: "Navy", from: "#183C78", to: "#1E4A8F" },
  { label: "Violet", from: "#7C3AED", to: "#EC4899" },
  { label: "Vert tropical", from: "#059669", to: "#0891B2" },
  { label: "Orange feu", from: "#EA580C", to: "#DC2626" },
  { label: "Nuit", from: "#111827", to: "#374151" },
  { label: "Menthe", from: "#00C47A", to: "#183C78" },
] as const;

export function GradientPicker({
  colorFrom,
  colorTo,
  savedGradients,
  onChange,
  onGradientSaved,
  onGradientDeleted,
}: GradientPickerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [gradientName, setGradientName] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function isActive(from: string, to: string) {
    return colorFrom.toLowerCase() === from.toLowerCase() &&
      colorTo.toLowerCase() === to.toLowerCase();
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await createBannerGradient({
        name: gradientName.trim(),
        color_from: colorFrom,
        color_to: colorTo,
      });
      if (result.success && result.gradient) {
        onGradientSaved(result.gradient);
        toast.success("Dégradé sauvegardé");
        setSaveDialogOpen(false);
        setGradientName("");
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    });
  }

  function handleDelete(id: number) {
    setDeletingId(id);
    startDeleteTransition(async () => {
      try {
        const result = await deleteBannerGradient(id);
        if (result.success) {
          onGradientDeleted(id);
          toast.success("Dégradé supprimé");
        } else {
          toast.error(result.error || "Erreur lors de la suppression");
        }
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Built-in presets */}
      <div className="space-y-2">
        <Label>Prédégradés</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUILTIN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.from, preset.to)}
              className={cn(
                "h-8 w-full rounded-md border-2 transition-all",
                isActive(preset.from, preset.to)
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-border"
              )}
              style={{
                background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
              }}
              aria-label={preset.label}
              aria-pressed={isActive(preset.from, preset.to)}
            />
          ))}
        </div>
      </div>

      {/* Saved gradients */}
      {savedGradients.length > 0 && (
        <div className="space-y-2">
          <Label>Mes dégradés</Label>
          <div className="space-y-1">
            {savedGradients.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onChange(g.color_from, g.color_to)}
                  className={cn(
                    "h-7 flex-1 rounded border-2 text-left transition-all",
                    isActive(g.color_from, g.color_to)
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${g.color_from}, ${g.color_to})`,
                  }}
                  aria-label={g.name}
                  aria-pressed={isActive(g.color_from, g.color_to)}
                />
                <span className="w-24 truncate text-xs text-muted-foreground">
                  {g.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={deletingId === g.id}
                  onClick={() => handleDelete(g.id)}
                  aria-label={`Supprimer ${g.name}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free color pickers */}
      <div className="space-y-2">
        <Label>Couleur libre</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Début</span>
            <input
              type="color"
              name="bg_gradient_from"
              value={colorFrom}
              onChange={(e) => onChange(e.target.value, colorTo)}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Fin</span>
            <input
              type="color"
              name="bg_gradient_to"
              value={colorTo}
              onChange={(e) => onChange(colorFrom, e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setGradientName("");
            setSaveDialogOpen(true);
          }}
        >
          Sauvegarder ce dégradé
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nommer ce dégradé</DialogTitle>
            <DialogDescription>
              Choisissez un nom pour réutiliser ce dégradé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div
              className="h-12 w-full rounded-lg"
              style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
            />
            <Input
              value={gradientName}
              onChange={(e) => setGradientName(e.target.value)}
              placeholder="Ex: Violet Coucher de soleil"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isSaving || !gradientName.trim()}
              onClick={handleSave}
            >
              {isSaving ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
