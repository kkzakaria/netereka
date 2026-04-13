import type { WebhookPayload } from "./types";

export interface ParsedMessage {
  from: string;
  messageId: string;
  text: string;
  contactName: string;
  phoneNumberId: string;
}

export function handleVerification(url: URL, verifyToken: string): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return new Response("Invalid mode", { status: 400 });
  }

  if (token !== verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge ?? "", { status: 200 });
}

export function parseIncomingMessages(payload: WebhookPayload): ParsedMessage[] {
  const parsed: ParsedMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { messages, contacts, metadata } = change.value;
      if (!messages) continue;

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const contact = contacts?.find((c) => c.wa_id === msg.from);
        parsed.push({
          from: msg.from,
          messageId: msg.id,
          text: msg.text.body,
          contactName: contact?.profile.name ?? "Unknown",
          phoneNumberId: metadata.phone_number_id,
        });
      }
    }
  }

  return parsed;
}
