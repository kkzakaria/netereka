import type { AuditAction } from "@/lib/db/types";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.created": "Création de compte",
  "user.role_changed": "Changement de rôle",
  "user.banned": "Bannissement",
  "user.unbanned": "Débannissement",
  "product.draft_created": "Brouillon produit créé",
  "product.draft_updated": "Brouillon produit modifié",
  "product.draft_deleted": "Brouillon produit supprimé",
  "banner.created": "Bannière créée (inactive)",
  "revision.created.update": "Révision déposée (mise à jour)",
  "revision.created.publish": "Révision déposée (publication)",
  "revision.created.add_images": "Révision déposée (ajout d'images)",
  "revision.created.remove_image": "Révision déposée (suppression d'image)",
  "revision.created.set_variants": "Révision déposée (variantes)",
  "revision.applied": "Révision appliquée",
  "revision.rejected": "Révision rejetée",
  "revision.apply_conflict": "Application de révision annulée (conflit)",
  "revision.reconcile_failed": "Échec de la réconciliation après conflit",
};

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes les actions" },
  ...(Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][]).map(([value, label]) => ({ value, label })),
];
