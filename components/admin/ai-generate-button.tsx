"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AiGenerateButtonProps<T> {
  onGenerate: () => Promise<{ success: boolean; error?: string; data?: T }>;
  onResult: (data: T) => void;
  label?: string;
  disabled?: string; // tooltip text when disabled, undefined = enabled
  size?: "xs" | "sm" | "default";
}

export function AiGenerateButton<T>({
  onGenerate,
  onResult,
  label = "Générer avec l'IA",
  disabled,
  size = "sm",
}: AiGenerateButtonProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const result = await onGenerate();
      if (result.success && result.data) {
        onResult(result.data);
        toast.success("Contenu généré avec succès");
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur de connexion. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleClick}
      disabled={isLoading || !!disabled}
      title={disabled || label}
      className="gap-1.5"
    >
      {isLoading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <span className="text-sm">✨</span>
      )}
      <span className="hidden sm:inline">{isLoading ? "Génération..." : label}</span>
    </Button>
  );
}
