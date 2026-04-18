"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXAMPLES = ["iPhone 15 Pro", "Samsung Galaxy A55", "MacBook Air M3", "AirPods Pro 2"];

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
          placeholder="ex: Samsung Galaxy A55"
          disabled={disabled}
          autoFocus
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Marque + modèle suffit. Ajoutez la capacité (ex: 128Go) pour un modèle précis.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onPromptChange(ex)}
            className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
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
