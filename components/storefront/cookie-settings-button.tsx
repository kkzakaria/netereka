"use client";

import { useConsentStore } from "@/stores/consent-store";

export function CookieSettingsButton() {
  const resetConsent = useConsentStore((s) => s.resetConsent);
  return (
    <button
      onClick={resetConsent}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Gérer les cookies
    </button>
  );
}
