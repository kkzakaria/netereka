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
      // POST same-origin : better-auth contrôle l'en-tête Origin. On renvoie la
      // requête OAuth signée exactement telle qu'elle figure dans l'URL de cette
      // page (window.location.search, sans « ? ») : le serveur en vérifie la
      // signature et l'expiration, et n'approuve que CETTE demande.
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept, oauth_query: window.location.search.replace(/^\?/, "") }),
      });
      const body = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !body?.url) {
        setError("La demande a expiré. Relancez la connexion depuis votre assistant.");
        setPending(null);
        return;
      }
      window.location.assign(body.url);
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
