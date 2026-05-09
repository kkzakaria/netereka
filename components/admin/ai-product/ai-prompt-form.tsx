"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AiPromptFormProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  error?: string | null;
}

export function AiPromptForm({ prompt, onPromptChange, onSubmit, disabled, error }: AiPromptFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && prompt.trim().length >= 3) onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Décrivez le produit</Label>
        <Input
          id="ai-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Marque + modèle"
          disabled={disabled}
          autoFocus
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Marque + modèle suffit. Ajoutez la capacité (ex: 128Go) pour un modèle précis.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={disabled || prompt.trim().length < 3} className="w-full">
        ✨ Générer la fiche
      </Button>
    </form>
  );
}
