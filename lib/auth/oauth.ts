import { getCloudflareContext } from "@opennextjs/cloudflare";

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

// --- Google ---

export async function getGoogleAuthUrl(): Promise<string> {
  const env = await getEnv();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl("google", env.SITE_URL),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
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
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
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
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: callbackUrl("facebook", env.SITE_URL),
    scope: "email,public_profile",
    response_type: "code",
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
  const tokens = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(
    `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${tokens.access_token}`
  );
  return userRes.json() as Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    picture: { data: { url: string } };
  }>;
}

// --- Apple ---

export async function getAppleAuthUrl(): Promise<string> {
  const env = await getEnv();
  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID,
    redirect_uri: callbackUrl("apple", env.SITE_URL),
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
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
  const tokens = (await tokenRes.json()) as { id_token: string };

  // Decode the id_token (JWT) to get user info
  const [, payloadB64] = tokens.id_token.split(".");
  const payload = JSON.parse(atob(payloadB64)) as {
    sub: string;
    email: string;
  };

  return {
    id: payload.sub,
    email: payload.email,
    first_name: "",
    last_name: "",
  };
}
