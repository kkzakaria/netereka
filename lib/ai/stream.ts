import type { ProductBlueprint } from "./schemas";

// ── SSE event types ───────────────────────────────────────────────────────────

export interface SSEStatusEvent {
  type: "status";
  message: string;
}

export interface SSEErrorEvent {
  type: "error";
  message: string;
}

export interface SSEDoneEvent {
  type: "done";
  blueprint: ProductBlueprint;
  categoryName: string;
  imageUrls: string[];
}

export type SSEEvent = SSEStatusEvent | SSEErrorEvent | SSEDoneEvent;

// ── Wire utilities ────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

export function encodeSSE(payload: SSEEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as SSEEvent;
  } catch {
    return null;
  }
}
