"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  whatsappConfigSchema,
  type WhatsAppConfigInput,
} from "@/lib/validations/whatsapp-config";
import { saveWhatsAppConfig, type WhatsAppConfig } from "@/actions/admin/whatsapp";

interface WhatsAppConfigFormProps {
  config: WhatsAppConfig | null;
}

const FIELD_NAMES = [
  "display_phone_number",
  "phone_number_id",
  "business_account_id",
  "access_token",
  "verify_token",
  "webhook_secret",
  "admin_phones",
  "is_active",
] as const;

function isFieldName(value: string): value is (typeof FIELD_NAMES)[number] {
  return (FIELD_NAMES as readonly string[]).includes(value);
}

/**
 * Construit la valeur `aria-describedby` d'un champ : le message d'erreur quand il
 * est affiché, plus l'indication de format quand le champ en porte une. `aria-invalid`
 * seul fait annoncer « champ invalide » par un lecteur d'écran sans jamais dire
 * pourquoi — la relation doit être explicite pour que le message soit lu.
 */
function fieldDescribedBy(name: string, error: unknown, hasHint: boolean): string | undefined {
  const ids: string[] = [];
  if (error) ids.push(`${name}-error`);
  if (hasHint) ids.push(`${name}-hint`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function WhatsAppConfigForm({ config }: WhatsAppConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<WhatsAppConfigInput>({
    resolver: zodResolver(whatsappConfigSchema),
    defaultValues: {
      display_phone_number: config?.display_phone_number ?? "",
      phone_number_id: config?.phone_number_id ?? "",
      business_account_id: config?.business_account_id ?? "",
      // Secrets arrive masked (•••••••• + last 4) — submitting them unchanged
      // preserves the stored value server-side.
      access_token: config?.access_token ?? "",
      verify_token: config?.verify_token ?? "",
      webhook_secret: config?.webhook_secret ?? "",
      admin_phones: config?.admin_phones ?? "[]",
      is_active: config?.is_active === 1,
    },
  });

  function onSubmit(values: WhatsAppConfigInput) {
    startTransition(async () => {
      try {
        const result = await saveWhatsAppConfig(values);
        if (result.success) {
          toast.success("Configuration WhatsApp sauvegardée");
          return;
        }
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const message = messages?.[0];
            if (message && isFieldName(field)) {
              setError(field, { type: "server", message });
            }
          }
          toast.error(
            Object.values(result.fieldErrors).flat()[0] ?? "Erreur de validation"
          );
          return;
        }
        toast.error(result.error ?? "Une erreur est survenue");
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
                {...register("display_phone_number")}
                aria-invalid={!!errors.display_phone_number}
                aria-describedby={fieldDescribedBy("display_phone_number", errors.display_phone_number, true)}
                placeholder="Ex: 2250700000001"
              />
              {errors.display_phone_number && (
                <p id="display_phone_number-error" className="text-sm text-destructive">
                  {errors.display_phone_number.message}
                </p>
              )}
              <p id="display_phone_number-hint" className="text-xs text-muted-foreground">
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
                {...register("phone_number_id")}
                aria-invalid={!!errors.phone_number_id}
                aria-describedby={fieldDescribedBy("phone_number_id", errors.phone_number_id, true)}
                placeholder="Ex: 123456789012345"
              />
              {errors.phone_number_id && (
                <p id="phone_number_id-error" className="text-sm text-destructive">
                  {errors.phone_number_id.message}
                </p>
              )}
              <p id="phone_number_id-hint" className="text-xs text-muted-foreground">
                ID opaque fourni par Meta (différent du numéro public).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_account_id">Business Account ID</Label>
              <Input
                id="business_account_id"
                {...register("business_account_id")}
                aria-invalid={!!errors.business_account_id}
                aria-describedby={fieldDescribedBy("business_account_id", errors.business_account_id, false)}
                placeholder="Ex: 123456789012345"
              />
              {errors.business_account_id && (
                <p id="business_account_id-error" className="text-sm text-destructive">
                  {errors.business_account_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <div className="flex gap-2">
                <Input
                  id="access_token"
                  type={showAccessToken ? "text" : "password"}
                  {...register("access_token")}
                  aria-invalid={!!errors.access_token}
                  aria-describedby={fieldDescribedBy("access_token", errors.access_token, false)}
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
              {errors.access_token && (
                <p id="access_token-error" className="text-sm text-destructive">
                  {errors.access_token.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify_token">Verify Token (webhook)</Label>
              <Input
                id="verify_token"
                {...register("verify_token")}
                aria-invalid={!!errors.verify_token}
                aria-describedby={fieldDescribedBy("verify_token", errors.verify_token, false)}
                placeholder="Token de vérification du webhook"
              />
              {errors.verify_token && (
                <p id="verify_token-error" className="text-sm text-destructive">
                  {errors.verify_token.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook_secret"
                  type={showWebhookSecret ? "text" : "password"}
                  {...register("webhook_secret")}
                  aria-invalid={!!errors.webhook_secret}
                  aria-describedby={fieldDescribedBy("webhook_secret", errors.webhook_secret, false)}
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
              {errors.webhook_secret && (
                <p id="webhook_secret-error" className="text-sm text-destructive">
                  {errors.webhook_secret.message}
                </p>
              )}
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
                rows={3}
                {...register("admin_phones")}
                aria-invalid={!!errors.admin_phones}
                aria-describedby={fieldDescribedBy("admin_phones", errors.admin_phones, true)}
                placeholder='["2250700000001", "2250700000002"]'
              />
              {errors.admin_phones && (
                <p id="admin_phones-error" className="text-sm text-destructive">
                  {errors.admin_phones.message}
                </p>
              )}
              <p id="admin_phones-hint" className="text-muted-foreground text-xs">
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
                <Label htmlFor="is_active">Bot WhatsApp actif</Label>
                <p className="text-muted-foreground text-sm">
                  Active le bot conversationnel (nécessite l&apos;intégration API complète).
                </p>
              </div>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
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
