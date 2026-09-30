import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/guards";
import { findOAuthClientName, parseConsentRequest } from "@/lib/auth/mcp-consent-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "./consent-form";

export const dynamic = "force-dynamic";
// La requête OAuth signée (dont sig) voyage dans l'URL de cette page ; ne jamais
// la laisser fuiter vers un tiers via l'en-tête Referer d'un lien sortant.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Rejoue les paramètres de l'URL en URLSearchParams (les valeurs répétées comme ba_param restent multiples). */
function toSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") out.append(key, value);
    else if (Array.isArray(value)) for (const v of value) out.append(key, v);
  }
  return out;
}

/**
 * Page de consentement OAuth : un humain doit cliquer « Autoriser » avant qu'un
 * assistant IA reçoive un jeton d'administration. better-auth (fournisseur OAuth
 * 1.7) y redirige avec la requête OAuth signée dans l'URL.
 *
 * L'identité affichée est le `client_id` (l'URL HTTPS du document de métadonnées
 * du client, donc son domaine) et l'hôte de redirection — pas le nom que le
 * client s'est donné, qui n'est qu'indicatif. Le formulaire renvoie la requête
 * signée au serveur, qui en vérifie la signature au clic (voir consent-form.tsx).
 * Réservé aux administrateurs : un client ne reçoit rien qui ne soit refusé plus
 * loin, mais un compte client n'a pas à voir cette page.
 */
export default async function McpConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getOptionalSession();
  const params = toSearchParams(await searchParams);
  if (!session) redirect(`/admin/login${params.size ? `?${params.toString()}` : ""}`);

  const role = session.user.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const request = isAdmin ? parseConsentRequest(params) : null;
  const clientName = request ? await findOAuthClientName(request.clientId) : null;

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
                  <span className="font-semibold">{clientName ?? "Un client OAuth sans nom"}</span>{" "}
                  demande l&apos;accès à l&apos;administration NETEREKA en votre nom. Il pourra créer et
                  modifier des brouillons produits, mais jamais les publier.
                </p>
                <p className="break-all text-sm font-semibold">
                  Identité du client :{" "}
                  <span className="font-mono">{request.clientHost ?? request.clientId}</span>
                </p>
                <p className="text-sm font-semibold">
                  Redirection vers : <span className="font-mono">{request.redirectHost}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez que ces noms de domaine correspondent bien à l&apos;assistant que vous
                  venez d&apos;autoriser avant de continuer. Le nom affiché plus haut est déclaré
                  par le client lui-même ; seul son domaine fait foi.
                </p>
                {request.scopes.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Portées demandées : {request.scopes.join(", ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-destructive">
                {isAdmin
                  ? "Demande d'autorisation invalide ou expirée. Relancez la connexion depuis votre assistant."
                  : "Cette page est réservée aux administrateurs."}
              </p>
            )}
            <ConsentForm disabled={!request} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
