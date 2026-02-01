import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { getUserByEmail, createUser } from "@/lib/db/users";
import {
  getGoogleUser,
  getFacebookUser,
  getAppleUser,
  validateOAuthState,
} from "@/lib/auth/oauth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
  }

  // Validate OAuth state to prevent CSRF
  const validState = await validateOAuthState(state);
  if (!validState) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid_state", request.url));
  }

  try {
    let profile: {
      email: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };

    switch (provider) {
      case "google": {
        const g = await getGoogleUser(code);
        profile = {
          email: g.email,
          first_name: g.given_name,
          last_name: g.family_name,
          avatar_url: g.picture,
        };
        break;
      }
      case "facebook": {
        const f = await getFacebookUser(code);
        profile = {
          email: f.email,
          first_name: f.first_name,
          last_name: f.last_name,
          avatar_url: f.picture?.data?.url,
        };
        break;
      }
      case "apple": {
        const a = await getAppleUser(code);
        profile = {
          email: a.email,
          first_name: a.first_name || "Utilisateur",
          last_name: a.last_name || "Apple",
        };
        break;
      }
      default:
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (!profile.email) {
      return NextResponse.redirect(
        new URL("/auth/login?error=no_email", request.url)
      );
    }

    // Find or create user
    const user = await getUserByEmail(profile.email);
    let userId: string;

    if (user) {
      userId = user.id;
    } else {
      userId = await createUser({
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        auth_provider: provider,
        avatar_url: profile.avatar_url ?? null,
        is_verified: 1,
      });
    }

    await createSession(userId);
    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
