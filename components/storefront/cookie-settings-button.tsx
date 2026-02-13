"use client";

import { useConsentStore } from "@/stores/consent-store";

export function CookieSettingsButton() {
  return (
    <button
      onClick={() => useConsentStore.setState({ consent: null })}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Gérer les cookies
    </button>
  );
}
