const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

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
    });
  }

  private async send(
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
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
