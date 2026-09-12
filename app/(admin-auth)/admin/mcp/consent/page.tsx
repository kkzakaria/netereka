import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/guards";
import { findConsentRequest } from "@/lib/auth/mcp-consent-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";
// The consent code rides in this page's own URL (?consent_code=...); never
// let it leak to a third party via the Referer header of an outbound link.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
}

/**
 * Landing page of the forced OAuth consent step (lib/auth/mcp-consent-hook.ts).
 * better-auth redirected here with `consent_code` in both a signed cookie and
 * the query string (node_modules/better-auth/dist/plugins/mcp/authorize.mjs:130-136).
 * The displayed client name and redirect host are resolved from the code
 * itself via `findConsentRequest` — never from the query's `client_id`, which
 * an attacker fully controls — and the form posts that same code back so the
 * server (`/api/auth/oauth2/consent`) consumes exactly the request shown here
 * instead of falling back to whatever cookie happens to be set.
 */
export default async function McpConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getOptionalSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const consentCode = first(params.consent_code);
  const request = consentCode ? await findConsentRequest(consentCode) : null;

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
            {request ? (
              <>
                <p className="text-sm">
                  <span className="font-semibold">{request.clientName ?? "Un client OAuth inconnu"}</span>{" "}
                  demande l&apos;accès à l&apos;administration NETEREKA en votre nom. Il pourra créer et
                  modifier des brouillons produits, mais jamais les publier.
                </p>
                <p className="text-sm font-semibold">
                  Redirection vers : <span className="font-mono">{request.redirectHost}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez que ce nom de domaine correspond bien à l&apos;assistant que vous venez
                  d&apos;autoriser avant de continuer.
                </p>
                {request.scopes.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Portées demandées : {request.scopes.join(", ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-destructive">
                Client OAuth inconnu ou demande expirée. Relancez la connexion depuis votre assistant.
              </p>
            )}
            <ConsentForm disabled={!request} consentCode={consentCode} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
