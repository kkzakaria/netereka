"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveWhatsAppConfig, type WhatsAppConfig } from "@/actions/admin/whatsapp";

interface WhatsAppConfigFormProps {
  config: WhatsAppConfig | null;
}

export function WhatsAppConfigForm({ config }: WhatsAppConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const isActiveRef = useRef<HTMLInputElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await saveWhatsAppConfig(formData);
        if (result.success) {
          toast.success("Configuration WhatsApp sauvegardée");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="space-y-6">
        {/* Public display — minimal config for storefront buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Affichage public</CardTitle>
            <p className="text-sm text-muted-foreground">
              Numéro WhatsApp affiché aux clients via les boutons &ldquo;Commander sur WhatsApp&rdquo; du storefront.
              Ce champ seul suffit pour activer les boutons (sans bot).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_phone_number">Numéro public</Label>
              <Input
                id="display_phone_number"
                name="display_phone_number"
                defaultValue={config?.display_phone_number ?? ""}
                placeholder="Ex: 2250700000001"
              />
              <p className="text-xs text-muted-foreground">
                Format international sans « + », entre 8 et 15 chiffres. Utilisé pour les liens wa.me.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API credentials — required for bot + webhooks */}
        <Card>
          <CardHeader>
            <CardTitle>Intégration API (Bot conversationnel)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ces champs sont requis uniquement si vous activez le bot WhatsApp conversationnel.
              Obtenus depuis Meta Business Suite → WhatsApp → API Setup.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input
                id="phone_number_id"
                name="phone_number_id"
                defaultValue={config?.phone_number_id ?? ""}
                placeholder="Ex: 123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                ID opaque fourni par Meta (différent du numéro public).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_account_id">Business Account ID</Label>
              <Input
                id="business_account_id"
                name="business_account_id"
                defaultValue={config?.business_account_id ?? ""}
                placeholder="Ex: 123456789012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <div className="flex gap-2">
                <Input
                  id="access_token"
                  name="access_token"
                  type={showAccessToken ? "text" : "password"}
                  defaultValue={config?.access_token ?? ""}
                  placeholder="EAAxxxxxxxx..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccessToken((v) => !v)}
                  className="shrink-0"
                >
                  {showAccessToken ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify_token">Verify Token (webhook)</Label>
              <Input
                id="verify_token"
                name="verify_token"
                defaultValue={config?.verify_token ?? ""}
                placeholder="Token de vérification du webhook"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook_secret"
                  name="webhook_secret"
                  type={showWebhookSecret ? "text" : "password"}
                  defaultValue={config?.webhook_secret ?? ""}
                  placeholder="Secret HMAC pour valider les webhooks"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWebhookSecret((v) => !v)}
                  className="shrink-0"
                >
                  {showWebhookSecret ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Phones */}
        <Card>
          <CardHeader>
            <CardTitle>Numéros administrateurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_phones">Numéros WhatsApp (JSON)</Label>
              <Textarea
                id="admin_phones"
                name="admin_phones"
                rows={3}
                defaultValue={config?.admin_phones ?? "[]"}
                placeholder='["2250700000001", "2250700000002"]'
              />
              <p className="text-muted-foreground text-xs">
                Tableau JSON des numéros WhatsApp qui recevront les alertes d&apos;escalade
                (avec indicatif pays, sans « + »). Ex&nbsp;: <code>[&quot;2250700000001&quot;]</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Activation */}
        <Card>
          <CardHeader>
            <CardTitle>Activation du bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Bot WhatsApp actif</Label>
                <p className="text-muted-foreground text-sm">
                  Active le bot conversationnel (nécessite l&apos;intégration API complète).
                </p>
              </div>
              <input
                type="hidden"
                name="is_active"
                ref={isActiveRef}
                defaultValue={config?.is_active ?? 0}
              />
              <Switch
                defaultChecked={config ? config.is_active === 1 : false}
                onCheckedChange={(checked) => {
                  if (isActiveRef.current) {
                    isActiveRef.current.value = checked ? "1" : "0";
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Enregistrement..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </form>
  );
}
