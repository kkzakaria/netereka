import { getKV } from "@/lib/cloudflare/context";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes

function key(action: string, identifier: string): string {
  return `ratelimit:${action}:${identifier}`;
}

export async function checkRateLimit(
  action: string,
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const kv = await getKV();
  const k = key(action, identifier);
  const raw = await kv.get(k);
  const attempts = raw ? parseInt(raw, 10) : 0;

  if (attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - attempts };
}

export async function recordAttempt(
  action: string,
  identifier: string
): Promise<void> {
  const kv = await getKV();
  const k = key(action, identifier);
  const raw = await kv.get(k);
  const attempts = raw ? parseInt(raw, 10) : 0;

  await kv.put(k, String(attempts + 1), {
    expirationTtl: WINDOW_SECONDS,
  });
}

export async function resetRateLimit(
  action: string,
  identifier: string
): Promise<void> {
  const kv = await getKV();
  await kv.delete(key(action, identifier));
}
