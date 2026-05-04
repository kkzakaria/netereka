import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { aiPromptSchema } from "@/lib/validations/product-ai";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getAnthropicClient } from "@/lib/ai/client";
import { getAiSettings } from "@/lib/ai/config";
import { researchProduct } from "@/lib/ai/product-research";

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); }
  catch { return new NextResponse("Forbidden", { status: 403 }); }

  const settings = await getAiSettings();
  if (!settings.enabled) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await req.json().catch(() => null) as { prompt?: unknown } | null;
  const parsed = aiPromptSchema.safeParse(body?.prompt);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_prompt", issues: parsed.error.issues }, { status: 400 });
  }

  const rl = await checkRateLimit(session.user.id);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec) },
    });
  }

  const anthropic = await getAnthropicClient();
  const encoder = new TextEncoder();
  const model = settings.model ?? undefined;
  const braveApiKey = settings.braveApiKey ?? null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for await (const ev of researchProduct(parsed.data, anthropic, { model, braveApiKey })) {
          write(ev);
        }
      } catch (err) {
        console.error("[ai-product] route stream error:", err);
        write({ type: "error", code: "api_error" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
