import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function verifyTurnstile(token: string): Promise<boolean> {
  const { env } = await getCloudflareContext();
  const secret = (env as CloudflareEnv).TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TURNSTILE_SECRET_KEY is not configured");
    }
    // Dev only: skip verification
    return true;
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    }
  );

  const data = (await res.json()) as { success: boolean };
  return data.success;
}
