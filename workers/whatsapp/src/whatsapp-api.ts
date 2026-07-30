const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Wall-clock ceiling on a single Graph API round trip.
 *
 * Nothing here runs on the webhook's acknowledgement path — `index.ts` returns
 * 200 to Meta immediately and hands the work to `ctx.waitUntil`, so the 5s
 * webhook budget is not what this protects. What it protects is the deferred
 * budget: a request that never settles holds that work open until the runtime
 * cancels it, taking every later step with it — the remaining admin phones on
 * an escalation, the context save and the outbound log on a customer reply.
 *
 * Ten seconds is roughly an order of magnitude above a normal send, so a
 * slow-but-working call is never recorded as a failure. That direction matters
 * more than tightness here: a false failure would tell a customer nobody was
 * reached, and would skip the acknowledgement marker, for a call that in fact
 * succeeded. Cutting it to one or two seconds would buy nothing — the sends
 * are dispatched concurrently, so the worst case is one timeout, not one per
 * recipient.
 */
const REQUEST_TIMEOUT_MS = 10_000;

export class WhatsAppAPI {
  private url: string;
  private headers: Record<string, string>;

  constructor(phoneNumberId: string, accessToken: string) {
    this.url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async sendText(
    to: string,
    body: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    };

    return this.send(payload);
  }

  async markAsRead(messageId: string): Promise<void> {
    await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private async send(
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // A timeout surfaces as a rejection, exactly like any other network
    // failure. The throw/return contract is left as it was on purpose: every
    // caller already guards a rejected send, and turning failures into a
    // returned `{ success: false }` here would silently change which branch
    // the orchestrator takes on a failed customer reply.
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const error = data.error as { message?: string } | undefined;
      return { success: false, error: error?.message ?? "Unknown API error" };
    }

    const messages = data.messages as { id: string }[] | undefined;
    return { success: true, messageId: messages?.[0]?.id };
  }
}
