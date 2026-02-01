import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const SESSION_COOKIE_NAME = "netereka_session";
export const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

async function getSecret(): Promise<Uint8Array> {
  const { env } = await getCloudflareContext();
  const secret = (env as CloudflareEnv).JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string): Promise<void> {
  const secret = await getSecret();
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
