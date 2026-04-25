"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAiConfig, type AiConfigView } from "@/actions/admin/ai-config";

interface AiConfigFormProps {
  config: AiConfigView;
}

export function AiConfigForm({ config }: AiConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showApiKey, setShowApiKey] = useState(false);
  const [enabled, setEnabled] = useState(config.enabled);

  function handleSubmit(formData: FormData) {
    // <Switch> has no `name` prop, so it doesn't appear in FormData by itself.
    // Inject the controlled `enabled` state explicitly so the server action receives it.
    formData.set("enabled", enabled ? "on" : "off");

    startTransition(async () => {
      try {
        const result = await saveAiConfig(formData);
        if (result.success) {
          toast.success("Configuration AI sauvegardée");
        } else if (result.fieldErrors) {
          const first = Object.values(result.fieldErrors).flat()[0];
          toast.error(first ?? "Erreur de validation");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch (error) {
        console.error("[ai-config-form] saveAiConfig threw:", error);
        toast.error(
          error instanceof Error
            ? `Erreur serveur : ${error.message}`
            : "Erreur inattendue. Consultez la console pour les détails.",
        );
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clé API Anthropic</CardTitle>
            <p className="text-muted-foreground text-sm">
              Requise pour la génération assistée par IA des fiches produits.
              Récupérée depuis{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                console.anthropic.com
              </a>
              .
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.apiKeyFromEnv && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Clé chargée depuis la variable d&apos;environnement (legacy):{" "}
                <code>{config.apiKeyMask}</code>. Saisissez-la ici pour la gérer
                depuis l&apos;administration. Tant que ce champ reste vide, la valeur
                de l&apos;environnement continue d&apos;être utilisée.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="anthropic_api_key">Clé API</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic_api_key"
                  name="anthropic_api_key"
                  type={showApiKey ? "text" : "password"}
                  defaultValue={config.apiKeyFromEnv ? "" : (config.apiKeyMask ?? "")}
                  placeholder="sk-ant-api03-..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="shrink-0"
                >
                  {showApiKey ? "Masquer" : "Afficher"}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Quand une clé est enregistrée, ce champ affiche son masque
                (8 puces + 4 derniers caractères). Laissez le masque tel quel pour
                conserver la clé existante, ou saisissez une nouvelle valeur.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modèle</CardTitle>
            <p className="text-muted-foreground text-sm">
              Identifiant du modèle Anthropic à utiliser. Laissez vide pour utiliser
              le modèle par défaut configuré dans le code.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.modelFromEnv && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Modèle chargé depuis la variable d&apos;environnement (legacy):{" "}
                <code>{config.model}</code>. Tant que ce champ reste vide, la valeur
                de l&apos;environnement continue d&apos;être utilisée.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                name="model"
                defaultValue={config.modelFromEnv ? "" : (config.model ?? "")}
                placeholder="claude-opus-4-7"
              />
              <p className="text-muted-foreground text-xs">
                Ex&nbsp;: <code>claude-opus-4-7</code>, <code>claude-sonnet-4-6</code>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Création AI de produits active</Label>
                <p className="text-muted-foreground text-sm">
                  Affiche le bouton « Créer avec IA » dans la liste des produits et
                  autorise l&apos;accès à <code>/products/ai-new</code>.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Activer la création AI de produits"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </form>
  );
}
