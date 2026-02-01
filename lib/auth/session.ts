import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { nanoid } from "nanoid";
import { getKV } from "@/lib/cloudflare/context";

export const SESSION_COOKIE_NAME = "netereka_session";
export const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

async function getSecret(): Promise<Uint8Array> {
  const { env } = await getCloudflareContext();
  const secret = (env as CloudflareEnv).JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string): Promise<void> {
  const sessionId = nanoid();
  const secret = await getSecret();
  const token = await new SignJWT({ userId, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  // Store session in KV for revocability
  const kv = await getKV();
  await kv.put(`session:${sessionId}`, userId, {
    expirationTtl: SESSION_DURATION,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSession(): Promise<{ userId: string; sessionId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret);
    const sessionId = payload.sid as string;
    const userId = payload.userId as string;

    // Verify session still exists in KV (not revoked)
    const kv = await getKV();
    const stored = await kv.get(`session:${sessionId}`);
    if (!stored) return null;

    return { userId, sessionId };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const secret = await getSecret();
      const { payload } = await jwtVerify(token, secret);
      const sessionId = payload.sid as string;
      // Revoke from KV
      const kv = await getKV();
      await kv.delete(`session:${sessionId}`);
    } catch {
      // Token invalid, just clear cookie
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  // KV doesn't support prefix listing in Workers, so we store a revocation timestamp
  const kv = await getKV();
  await kv.put(`revoked_before:${userId}`, new Date().toISOString(), {
    expirationTtl: SESSION_DURATION,
  });
}
