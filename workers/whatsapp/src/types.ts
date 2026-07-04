export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  RESEND_API_KEY?: string;
}

// --- WhatsApp Webhook Types ---

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: IncomingMessage[];
    statuses?: MessageStatus[];
  };
  field: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "interactive" | "button";
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

// --- LLM Types ---

export interface ConversationContext {
  messages: ChatMessage[];
  intent?: string;
  last_activity: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// --- Session Types ---

export interface WhatsAppSession {
  id: string;
  wa_phone: string;
  user_id: string | null;
  // Account awaiting OTP confirmation. Promoted to user_id by verifyOtp on
  // success. Never trusted by order tools — those gate on is_verified.
  pending_user_id: string | null;
  is_verified: number;
  otp_code: string | null;
  otp_expires_at: string | null;
  status: "active" | "escalated" | "closed";
  created_at: string;
  updated_at: string;
}

// --- Tool Context ---

export interface ToolContext {
  db: D1Database;
  session: WhatsAppSession;
  env: Env;
}
