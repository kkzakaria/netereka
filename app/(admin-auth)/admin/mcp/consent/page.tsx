import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/guards";
import { findOAuthClientName } from "@/lib/auth/mcp-consent-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
}

/**
 * Landing page of the forced OAuth consent step (lib/auth/mcp-consent-hook.ts).
 * better-auth redirected here with `consent_code` in a signed cookie plus
 * `client_id` and `scope` in the query. The form posts to
 * /api/auth/oauth2/consent, which answers with the redirect URI to follow.
 */
export default async function McpConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getOptionalSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const clientId = first(params.client_id);
  const scopes = (first(params.scope) ?? "").split(" ").filter(Boolean);
  const clientName = clientId ? await findOAuthClientName(clientId) : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="NETEREKA" width={180} height={64} className="mx-auto h-14 w-auto" priority />
          <p className="mt-2 text-sm text-muted-foreground">Espace Administration</p>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Autoriser un assistant IA</CardTitle>
            <CardDescription>
              Connecté en tant que {session.user.name} ({session.user.email})
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {clientName ? (
              <p className="text-sm">
                <span className="font-semibold">{clientName}</span> demande l&apos;accès à
                l&apos;administration NETEREKA en votre nom. Il pourra créer et modifier des
                brouillons produits, mais jamais les publier.
              </p>
            ) : (
              <p className="text-sm text-destructive">
                Client OAuth inconnu. Relancez la connexion depuis votre assistant.
              </p>
            )}
            {scopes.length > 0 ? (
              <p className="text-xs text-muted-foreground">Portées demandées : {scopes.join(", ")}</p>
            ) : null}
            <ConsentForm disabled={!clientName} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
