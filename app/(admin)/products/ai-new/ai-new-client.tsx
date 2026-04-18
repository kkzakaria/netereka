"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AiPromptForm } from "@/components/admin/ai-product/ai-prompt-form";
import { AiProgressPanel, type ProgressStep } from "@/components/admin/ai-product/ai-progress-panel";
import { AiImageSelector } from "@/components/admin/ai-product/ai-image-selector";
import { importCandidateImages } from "@/actions/admin/products-ai";
import type { AiProductOutput } from "@/lib/validations/product-ai";

type UiState =
  | { kind: "prompt"; error?: string | null }
  | { kind: "generating"; completed: Set<ProgressStep>; active: ProgressStep | null }
  | { kind: "selecting"; output: AiProductOutput };

export function AiNewClient() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [ui, setUi] = useState<UiState>({ kind: "prompt", error: null });
  const [importing, startImporting] = useTransition();

  const generate = useCallback(async () => {
    const trimmed = prompt.trim();
    setUi({ kind: "generating", completed: new Set(), active: "search" });

    let resp: Response;
    try {
      resp = await fetch("/api/admin/products-ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
    } catch {
      setUi({ kind: "prompt", error: "Impossible de contacter le service. Réessayez." });
      return;
    }

    if (!resp.ok || !resp.body) {
      const msg = resp.status === 429
        ? "Limite de générations atteinte. Réessayez plus tard."
        : "Une erreur est survenue. Réessayez.";
      setUi({ kind: "prompt", error: msg });
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const completed = new Set<ProgressStep>();
    let active: ProgressStep | null = "search";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: { type: string; step?: ProgressStep; output?: AiProductOutput; reason?: string; code?: string };
        try { event = JSON.parse(line); } catch { continue; }

        if (event.type === "progress" && event.step) {
          if (active && active !== event.step) completed.add(active);
          active = event.step;
          setUi({ kind: "generating", completed: new Set(completed), active });
        } else if (event.type === "done" && event.output) {
          setUi({ kind: "selecting", output: event.output });
          return;
        } else if (event.type === "not_found") {
          setUi({ kind: "prompt", error: "Produit introuvable. Précisez marque + modèle." });
          return;
        } else if (event.type === "error") {
          setUi({ kind: "prompt", error: "Le modèle n'a pas pu produire une fiche valide. Réessayez." });
          return;
        }
      }
    }
  }, [prompt]);

  const confirmImport = useCallback((selectedUrls: string[]) => {
    if (ui.kind !== "selecting") return;
    startImporting(async () => {
      const r = await importCandidateImages(ui.output, selectedUrls);
      if (!r.success) { toast.error(r.error ?? "Erreur d'import"); return; }
      if (r.warnings && r.warnings.length > 0) {
        toast.warning(`${r.warnings.length} image(s) n'ont pas pu être importées.`);
      }
      router.push(`/products/${r.id}/edit`);
    });
  }, [ui, router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products" aria-label="Retour">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Créer un produit avec l&apos;IA</h1>
      </div>

      {ui.kind === "prompt" && (
        <AiPromptForm
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={generate}
          disabled={false}
          error={ui.error}
        />
      )}
      {ui.kind === "generating" && (
        <AiProgressPanel completed={ui.completed} active={ui.active} />
      )}
      {ui.kind === "selecting" && (
        <AiImageSelector
          output={ui.output}
          onConfirm={confirmImport}
          onCancel={() => setUi({ kind: "prompt", error: null })}
          busy={importing}
        />
      )}
    </div>
  );
}
