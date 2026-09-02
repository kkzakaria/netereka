"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsentForm({ disabled }: { disabled: boolean }) {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState("");

  async function submit(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError("");
    try {
      // Same-origin POST: better-auth validates the Origin header, and the
      // consent code travels in the signed `oidc_consent_prompt` cookie.
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept }),
      });
      const body = (await res.json().catch(() => null)) as { redirectURI?: string } | null;
      if (!res.ok || !body?.redirectURI) {
        setError("La demande a expiré. Relancez la connexion depuis votre assistant.");
        setPending(null);
        return;
      }
      window.location.assign(body.redirectURI);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="h-11 w-full" disabled={disabled || pending !== null} onClick={() => submit(true)}>
        {pending === "accept" ? "Autorisation…" : "Autoriser"}
      </Button>
      <Button variant="outline" className="h-11 w-full" disabled={pending !== null} onClick={() => submit(false)}>
        {pending === "deny" ? "Refus…" : "Refuser"}
      </Button>
    </div>
  );
}
