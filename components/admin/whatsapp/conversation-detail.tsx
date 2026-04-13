"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendAdminMessage, updateSessionStatus } from "@/actions/admin/whatsapp";
import type { ConversationListItem, MessageItem } from "@/actions/admin/whatsapp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWaPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+225") && cleaned.length === 13) {
    const local = cleaned.slice(4);
    return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  return phone;
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ConversationListItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Actif",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  escalated: {
    label: "Escalade",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
  closed: {
    label: "Fermée",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ConversationDetailProps {
  session: ConversationListItem;
  messages: MessageItem[];
}

export function ConversationDetail({
  session,
  messages,
}: ConversationDetailProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-scroll to bottom on load and when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const statusCfg = STATUS_CONFIG[session.status];

  function handleClose() {
    startTransition(async () => {
      const result = await updateSessionStatus(session.id, "closed");
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la fermeture.");
      }
    });
  }

  function handleResumeBot() {
    startTransition(async () => {
      const result = await updateSessionStatus(session.id, "active");
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la reprise.");
      }
    });
  }

  function handleSend() {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    startTransition(async () => {
      const result = await sendAdminMessage(session.id, text);
      if (result.success) {
        setMessageText("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de l'envoi.");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const displayName = session.user_name ?? formatWaPhone(session.wa_phone);

  return (
    <div className="space-y-4">
      {/* ── Session info header ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{displayName}</CardTitle>
              {session.user_name && (
                <p className="text-sm text-muted-foreground">
                  {formatWaPhone(session.wa_phone)}
                </p>
              )}
              {session.user_email && (
                <p className="text-sm text-muted-foreground">
                  {session.user_email}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={statusCfg.className}
                style={{ borderWidth: 1, borderStyle: "solid" }}
              >
                {statusCfg.label}
              </Badge>

              {(session.status === "active" ||
                session.status === "escalated") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Fermer
                </Button>
              )}

              {(session.status === "escalated" ||
                session.status === "closed") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResumeBot}
                  disabled={isPending}
                >
                  Reprendre le bot
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Chat view ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0 flex flex-col">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-[60vh] overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun message dans cette conversation.
              </p>
            ) : (
              messages.map((msg) => {
                const isInbound = msg.direction === "inbound";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isInbound
                          ? "bg-muted text-foreground mr-auto"
                          : "bg-primary text-primary-foreground ml-auto"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-3 flex gap-2">
            <Input
              placeholder="Écrire un message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isPending || !messageText.trim()}
            >
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
