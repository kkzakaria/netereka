import type { AuditAction } from "@/lib/db/types";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.role_changed": "Changement de rôle",
  "user.banned": "Bannissement",
  "user.unbanned": "Débannissement",
};

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes les actions" },
  { value: "user.role_changed", label: "Changement de rôle" },
  { value: "user.banned", label: "Bannissement" },
  { value: "user.unbanned", label: "Débannissement" },
];
