import type { Env, WebhookPayload } from "./types";
import { verifySignature } from "./crypto";
import { handleVerification, parseIncomingMessages } from "./webhook";
import { handleIncomingMessage } from "./orchestrator";

export type { Env };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    // GET: Meta webhook verification
    if (request.method === "GET") {
      const config = await getConfig(env.DB);
      if (!config || !config.verify_token) return new Response("Not configured", { status: 503 });
      return handleVerification(url, config.verify_token);
    }

    // POST: Incoming messages
    if (request.method === "POST") {
      const config = await getConfig(env.DB);
      const missing = getMissingFields(config);
      if (missing.length > 0 || !config) {
        // Distinguish "intentionally off" from "active but broken" — return 200 to avoid Meta retry storms either way
        if (config?.is_active) {
          console.error(`[webhook] CRITICAL: is_active=1 but missing fields: ${missing.join(", ")}. Messages are being dropped!`);
        } else {
          console.warn(`[webhook] bot inactive or unconfigured (missing: ${missing.join(", ")}), dropping message`);
        }
        return new Response("OK", { status: 200 });
      }

      // TypeScript: after getMissingFields passed, all required API fields are non-null.
      const phoneNumberId = config.phone_number_id!;
      const accessToken = config.access_token!;
      const webhookSecret = config.webhook_secret!;

      // Verify signature
      const body = await request.text();
      const signature = request.headers.get("x-hub-signature-256") ?? "";
      const isValid = await verifySignature(body, signature, webhookSecret);
      if (!isValid) {
        return new Response("Invalid signature", { status: 401 });
      }

      // Parse messages
      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body) as WebhookPayload;
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }

      const messages = parseIncomingMessages(payload);

      // Process messages asynchronously — ack Meta immediately (< 5s requirement)
      for (const msg of messages) {
        ctx.waitUntil(
          handleIncomingMessage(
            env,
            { phoneNumberId, accessToken },
            msg
          ).catch((err) => {
            console.error("Error processing message:", err);
          })
        );
      }

      return new Response("OK", { status: 200 });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
} satisfies ExportedHandler<Env>;

interface WhatsAppConfig {
  phone_number_id: string | null;
  access_token: string | null;
  verify_token: string | null;
  webhook_secret: string | null;
  admin_phones: string;
  is_active: number;
}

async function getConfig(db: D1Database): Promise<WhatsAppConfig | null> {
  return db
    .prepare("SELECT * FROM whatsapp_config WHERE id = 1")
    .first<WhatsAppConfig>();
}

function getMissingFields(config: WhatsAppConfig | null): string[] {
  if (!config) return ["config row"];
  const missing: string[] = [];
  if (!config.is_active) missing.push("is_active=0");
  if (!config.phone_number_id) missing.push("phone_number_id");
  if (!config.access_token) missing.push("access_token");
  if (!config.webhook_secret) missing.push("webhook_secret");
  return missing;
}
