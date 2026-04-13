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
      if (!config) return new Response("Not configured", { status: 503 });
      return handleVerification(url, config.verify_token);
    }

    // POST: Incoming messages
    if (request.method === "POST") {
      const config = await getConfig(env.DB);
      if (!config || !config.is_active) {
        console.warn("[webhook] WhatsApp config missing or inactive, dropping message");
        return new Response("OK", { status: 200 });
      }

      // Verify signature
      const body = await request.text();
      const signature = request.headers.get("x-hub-signature-256") ?? "";
      const isValid = await verifySignature(body, signature, config.webhook_secret);
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
            { phoneNumberId: config.phone_number_id, accessToken: config.access_token },
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
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  webhook_secret: string;
  admin_phones: string;
  is_active: number;
}

async function getConfig(db: D1Database): Promise<WhatsAppConfig | null> {
  return db
    .prepare("SELECT * FROM whatsapp_config WHERE id = 1")
    .first<WhatsAppConfig>();
}
