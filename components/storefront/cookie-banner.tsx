"use client";

import { useState } from "react";
import Link from "next/link";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function CookieBanner() {
  const consent = useConsentStore((s) => s.consent);
  const { acceptAll, rejectAll, updateConsent } = useConsentStore();
  const mounted = useMounted();
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(false);

  // Don't render until mounted (avoids hydration mismatch) or if already consented
  if (!mounted || consent !== null) return null;

  if (showSettings) {
    return (
      <div
        role="dialog"
        aria-label="Paramètres des cookies"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg sm:p-6"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-base font-semibold">Paramètres des cookies</h2>

          <div className="space-y-3">
            {/* Necessary cookies — always on */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cookies nécessaires</p>
                <p className="text-xs text-muted-foreground">
                  Session, panier, préférences d&apos;affichage. Indispensables
                  au fonctionnement du site.
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Toujours actif
              </span>
            </div>

            {/* Analytics cookies — toggleable */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cookies analytiques</p>
                <p className="text-xs text-muted-foreground">
                  Google Analytics — nous aident à comprendre comment vous
                  utilisez le site pour l&apos;améliorer.
                </p>
              </div>
              <Switch
                checked={analyticsToggle}
                onCheckedChange={setAnalyticsToggle}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
            <Link
              href="/politique-confidentialite"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Politique de confidentialité
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                Retour
              </Button>
              <Button
                size="sm"
                onClick={() => updateConsent("analytics", analyticsToggle)}
              >
                Enregistrer mes choix
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Consentement cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Nous utilisons des cookies analytiques pour améliorer votre
          expérience.{" "}
          <Link
            href="/politique-confidentialite"
            className="underline underline-offset-4 hover:text-foreground"
          >
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            Personnaliser
          </Button>
          <Button variant="outline" size="sm" onClick={rejectAll}>
            Tout refuser
          </Button>
          <Button size="sm" onClick={acceptAll}>
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
