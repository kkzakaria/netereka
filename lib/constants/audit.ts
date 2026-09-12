import type { AuditAction } from "@/lib/db/types";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.created": "Création de compte",
  "user.role_changed": "Changement de rôle",
  "user.banned": "Bannissement",
  "user.unbanned": "Débannissement",
  "product.draft_created": "Brouillon produit créé",
  "product.draft_updated": "Brouillon produit modifié",
  "product.draft_deleted": "Brouillon produit supprimé",
};

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes les actions" },
  ...(Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][]).map(([value, label]) => ({ value, label })),
];
