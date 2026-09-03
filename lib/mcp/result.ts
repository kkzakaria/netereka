export type McpErrorCode = "validation_error" | "not_found" | "conflict" | "limit_exceeded" | "internal_error";

/** Shape the MCP SDK expects back from a tool handler (text content only in phase 1). */
export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function fail(code: McpErrorCode, message: string, fieldErrors?: Record<string, string[]>): ToolResult {
  const body: Record<string, unknown> = { code, message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return { content: [{ type: "text", text: JSON.stringify(body) }], isError: true };
}
