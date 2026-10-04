import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { KV_HERO_PRELOAD_KEY, cleDuPrechargementRepli } from "@/lib/cloudflare/hero-preload-key";

// `/apercu` y figure bien qu'il vive dans le groupe `(storefront)` : la page
// appelle `requireAdmin()`, mais `(storefront)/loading.tsx` la place sous un
// `<Suspense>` — le gabarit part donc en 200 avant que la garde s'exécute, et
// la redirection devient une affaire de navigateur. Le visiteur voyait un
// instant l'en-tête et un squelette, et l'administrateur déconnecté perdait
// le lien de l'aperçu, `requireAdmin()` ne gardant aucun retour. Ici, c'est
// un 307 avant tout rendu, avec le chemin d'origine.
const PROTECTED_PATHS = ["/account", "/apercu", "/checkout", "/dashboard", "/products", "/orders", "/customers", "/users", "/categories", "/audit-log"];
const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";

export async function middleware(request: NextRequest) {
  const { hostname, pathname } = request.nextUrl;

  // Redirect www → apex for SEO canonicalization
  if (hostname === "www.netereka.ci") {
    const url = request.nextUrl.clone();
    url.hostname = "netereka.ci";
    return NextResponse.redirect(url, 301);
  }

  // Add Link preload header for homepage LCP — browser starts hero image fetch at TTFB.
  // Also forward the image key as a request header so the storefront layout can inject a
  // responsive <link rel="preload" imagesrcset="..."> in the initial HTML head bytes,
  // allowing the browser to pick the correct DPR variant before the Suspense resolves.
  if (pathname === "/") {
    try {
      const { env } = await getCloudflareContext();
      const linkValue = await env.KV.get(KV_HERO_PRELOAD_KEY);
      if (linkValue) {
        // La clé n'est transmise que si le préchargement vient du chemin de
        // REPLI (image rendue par React). Une composition libre demande
        // exactement l'URL de l'en-tête `Link` ci-dessous : lui ajouter un
        // `imagesrcset` ferait télécharger une seconde image, jamais
        // demandée. Voir `cleDuPrechargementRepli`.
        const imageKey = cleDuPrechargementRepli(linkValue);

        const requestHeaders = new Headers(request.headers);
        if (imageKey) requestHeaders.set("x-hero-image-key", imageKey);

        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.headers.set("Link", linkValue);
        return response;
      }
    } catch (err) {
      // Expected in local dev without wrangler bindings; should not fire in production.
      if (process.env.NODE_ENV === "production") {
        console.error("[middleware] KV read failed for hero preload header:", err);
      }
    }
  }

  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtectedPath) return NextResponse.next();

  const hasCookie = request.cookies.has(SESSION_COOKIE) || request.cookies.has(SECURE_SESSION_COOKIE);

  // No cookie on protected page → redirect to sign-in
  if (!hasCookie) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/checkout/:path*",
    "/dashboard/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/customers/:path*",
    "/users/:path*",
    "/categories/:path*",
    "/audit-log/:path*",
    // www redirect — match all paths
    { source: "/(.*)", has: [{ type: "host", value: "www.netereka.ci" }] },
  ],
};
