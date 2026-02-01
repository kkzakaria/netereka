import { getCloudflareContext } from "@opennextjs/cloudflare";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";

type OAuthEnv = CloudflareEnv & {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY: string;
  SITE_URL: string;
};

async function getEnv(): Promise<OAuthEnv> {
  const { env } = await getCloudflareContext();
  return env as OAuthEnv;
}

function callbackUrl(provider: string, siteUrl: string): string {
  return `${siteUrl}/api/auth/oauth/${provider}/callback`;
}

// --- OAuth State (CSRF protection) ---

const OAUTH_STATE_COOKIE = "oauth_state";

export async function generateOAuthState(): Promise<string> {
  const state = nanoid(32);
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  return state;
}

export async function validateOAuthState(state: string | null): Promise<boolean> {
  if (!state) return false;
  const cookieStore = await cookies();
  const stored = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);
  return !!stored && stored === state;
}

// --- Google ---

export async function getGoogleAuthUrl(): Promise<string> {
  const env = await getEnv();
  const state = await generateOAuthState();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl("google", env.SITE_URL),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function getGoogleUser(code: string) {
  const env = await getEnv();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl("google", env.SITE_URL),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Google userinfo fetch failed");
  return userRes.json() as Promise<{
    id: string;
    email: string;
    given_name: string;
    family_name: string;
    picture: string;
  }>;
}

// --- Facebook ---

export async function getFacebookAuthUrl(): Promise<string> {
  const env = await getEnv();
  const state = await generateOAuthState();
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: callbackUrl("facebook", env.SITE_URL),
    scope: "email,public_profile",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

export async function getFacebookUser(code: string) {
  const env = await getEnv();
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      code,
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: callbackUrl("facebook", env.SITE_URL),
    })}`
  );
  if (!tokenRes.ok) throw new Error("Facebook token exchange failed");
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(
    `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${tokens.access_token}`
  );
  if (!userRes.ok) throw new Error("Facebook user fetch failed");
  return userRes.json() as Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    picture: { data: { url: string } };
  }>;
}

// --- Apple ---

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

export async function getAppleAuthUrl(): Promise<string> {
  const env = await getEnv();
  const state = await generateOAuthState();
  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID,
    redirect_uri: callbackUrl("apple", env.SITE_URL),
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

export async function getAppleUser(code: string) {
  const env = await getEnv();
  const { SignJWT } = await import("jose");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(env.APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setAudience("https://appleid.apple.com")
    .setSubject(env.APPLE_CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: callbackUrl("apple", env.SITE_URL),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Apple token exchange failed");
  const tokens = (await tokenRes.json()) as { id_token: string };

  // Verify the id_token signature using Apple's JWKS
  const { payload } = await jwtVerify(tokens.id_token, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: env.APPLE_CLIENT_ID,
  });

  return {
    id: payload.sub as string,
    email: payload.email as string,
    first_name: "",
    last_name: "",
  };
}
