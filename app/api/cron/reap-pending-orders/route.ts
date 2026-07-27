import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare/context";
import { reapStalePendingOrders } from "@/lib/db/orders";

// IMPORTANT — this route has no automatic trigger.
//
// @opennextjs/cloudflare 1.19.1 does not expose a Workers `scheduled()`
// handler alongside the Next.js app: the generated `.open-next/worker.js`
// entry (regenerated on every `build:worker`, from
// node_modules/@opennextjs/cloudflare/dist/cli/templates/worker.js) only
// exports `fetch`, and `defineCloudflareConfig`'s `CloudflareOverrides` type
// has no hook to add one. Wiring a `triggers.crons` entry into the main
// wrangler.jsonc would therefore point Cloudflare's Cron Triggers at a
// worker with no `scheduled()` export — a cron that is configured but never
// actually fires (Cloudflare's own docs list "missing scheduled() export" as
// the #1 cause of "cron not executing"), which is worse than no cron at all
// because it looks like protection.
//
// This route is the reaper's securable, invokable surface instead: it can
// be called by whatever triggering mechanism is chosen (most likely a small
// companion Worker with its own wrangler cron trigger that does a `fetch()`
// here, mirroring the separate `workers/whatsapp/` deploy already used in
// this repo — or a scheduled CI job). That decision is intentionally left
// open; see task-3.2-report.md.
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

  const result = await reapStalePendingOrders();
  return NextResponse.json(result);
}
