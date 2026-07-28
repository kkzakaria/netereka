import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare/context";
import { reapStalePendingOrders } from "@/lib/db/orders";

// @opennextjs/cloudflare does not expose a Workers `scheduled()` handler
// alongside the Next.js app (the generated worker entry only implements
// `fetch`), so this sweep cannot be a native Cloudflare Cron Trigger on the
// main worker. Instead, an external scheduler — the "Reap Pending Orders"
// GitHub Actions workflow (.github/workflows/reap-pending-orders.yml) —
// calls this route on a schedule (and on manual dispatch) with a bearer
// secret.
export const dynamic = "force-dynamic";

/** Constant-time string comparison — avoids leaking the secret via response timing. */
function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

export async function POST(request: Request) {
  const env = await getEnv();
  const secret = env.CRON_SECRET;

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!secret || !provided || !timingSafeEqualString(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reapStalePendingOrders();
    return NextResponse.json(result);
  } catch (error) {
    // A batch that has already cancelled some orders and refunded their
    // stock before hitting an error on a later one is not something to
    // surface as a silent, uninformative 500 — log what we know and tell
    // the caller (the scheduled workflow) plainly that the run failed, so
    // it fails the job instead of reporting a false "nothing to do" green.
    console.error("reap-pending-orders route: reapStalePendingOrders threw", error);
    return NextResponse.json({ error: "Internal error while reaping pending orders" }, { status: 500 });
  }
}
