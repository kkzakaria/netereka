import type { ConversationContext } from "./types";

const KV_PREFIX = "wa:conv:";
const TTL_SECONDS = 86400;
const MAX_MESSAGES = 20;

export async function loadContext(
  kv: KVNamespace,
  waPhone: string
): Promise<ConversationContext> {
  const stored = await kv.get(`${KV_PREFIX}${waPhone}`);

  if (stored) {
    try {
      return JSON.parse(stored) as ConversationContext;
    } catch {
      console.error(`[context] Corrupted KV context for ${waPhone}, resetting`);
    }
  }

  return {
    messages: [],
    last_activity: new Date().toISOString(),
  };
}

export async function saveContext(
  kv: KVNamespace,
  waPhone: string,
  context: ConversationContext
): Promise<void> {
  const trimmed: ConversationContext = {
    ...context,
    messages: context.messages.slice(-MAX_MESSAGES),
  };

  await kv.put(`${KV_PREFIX}${waPhone}`, JSON.stringify(trimmed), {
    expirationTtl: TTL_SECONDS,
  });
}
