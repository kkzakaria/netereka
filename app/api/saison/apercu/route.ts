import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { NOM_COOKIE_APERCU } from "@/lib/saison/config";

/**
 * Aperçu du thème des fêtes, avant ou après sa fenêtre de dates.
 *
 * `GET /api/saison/apercu` pose le cookie pour 24 h, `?desactiver=1` le
 * retire. Le cookie ne suffit pas à lui seul : le layout de la boutique
 * revérifie à chaque requête que la session est celle d'un admin
 * (`lib/saison/etat.ts`). Un client qui recopierait le cookie ne verrait rien.
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const reponse = NextResponse.redirect(new URL("/", request.url));
  if (request.nextUrl.searchParams.get("desactiver") === "1") {
    reponse.cookies.set(NOM_COOKIE_APERCU, "", { path: "/", maxAge: 0 });
  } else {
    reponse.cookies.set(NOM_COOKIE_APERCU, "1", {
      path: "/",
      maxAge: 86400,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return reponse;
}
