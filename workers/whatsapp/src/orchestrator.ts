import type { Env, ToolContext } from "./types";
import type { ParsedMessage } from "./webhook";
import { findOrCreateSession } from "./session";
import { loadContext, saveContext } from "./context";
import { callLLM } from "./llm";
import { dispatchTool } from "./tools/registry";
import { WhatsAppAPI } from "./whatsapp-api";

const MAX_TOOL_ROUNDS = 3;
const ERROR_MESSAGE = "Désolé, une erreur technique est survenue. Veuillez réessayer dans quelques instants.";

export async function handleIncomingMessage(
  env: Env,
  config: { phoneNumberId: string; accessToken: string },
  message: ParsedMessage
): Promise<void> {
  const api = new WhatsAppAPI(config.phoneNumberId, config.accessToken);

  // Mark as read (fire-and-forget with logging)
  api.markAsRead(message.messageId).catch((err) => {
    console.error(`[orchestrator] Failed to mark message ${message.messageId} as read:`, err);
  });

  try {
    // 1. Find or create session
    const session = await findOrCreateSession(env.DB, message.from);

    // 2. Load conversation context from KV
    const context = await loadContext(env.KV, message.from);

    // 3. Add user message to context
    context.messages.push({ role: "user", content: message.text });

    // 4. Log inbound message to D1
    await logMessage(env.DB, session.id, message.messageId, "inbound", message.text, "text");

    // 5. Call LLM with tool loop
    const isVerified = session.is_verified === 1;
    const currentMessages = [...context.messages];
    let responseText: string | null = null;
    const toolCtx: ToolContext = { db: env.DB, session, env };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const llmResult = await callLLM(env.AI, currentMessages, isVerified);

      if (llmResult.type === "text") {
        responseText = llmResult.content;
        break;
      }

      // Execute tool calls
      for (const toolCall of llmResult.toolCalls) {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          console.error(`[orchestrator] Malformed tool arguments: ${toolCall.function.arguments}`);
          currentMessages.push({
            role: "tool",
            content: JSON.stringify({ success: false, error: "Invalid arguments" }),
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
          });
          continue;
        }

        const toolResult = await dispatchTool(toolCtx, toolCall.function.name, args);

        currentMessages.push({
          role: "assistant",
          content: "",
          name: toolCall.function.name,
        });
        currentMessages.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        });
      }
    }

    if (!responseText) {
      responseText = "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.";
    }

    // 6. Send response via WhatsApp
    const sendResult = await api.sendText(message.from, responseText);
    if (!sendResult.success) {
      console.error(`[orchestrator] Failed to send response to ${message.from}: ${sendResult.error}`);
    }

    // 7. Update context and save
    context.messages.push({ role: "assistant", content: responseText });
    await saveContext(env.KV, message.from, context);

    // 8. Log outbound message (only if sent successfully)
    if (sendResult.success) {
      await logMessage(
        env.DB,
        session.id,
        sendResult.messageId ?? null,
        "outbound",
        responseText,
        "text"
      );
    }
  } catch (err) {
    console.error(`[orchestrator] Failed to process message from ${message.from}:`, err);
    try {
      await api.sendText(message.from, ERROR_MESSAGE);
    } catch (sendErr) {
      console.error(`[orchestrator] Failed to send error message:`, sendErr);
    }
  }
}

async function logMessage(
  db: D1Database,
  sessionId: string,
  waMessageId: string | null,
  direction: "inbound" | "outbound",
  content: string,
  messageType: string
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO whatsapp_messages (id, session_id, wa_message_id, direction, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, sessionId, waMessageId, direction, content, messageType)
    .run();
}
