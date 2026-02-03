// Re-export from permissions for backward compatibility
export {
  TEAM_ROLE_LABELS,
  TEAM_ROLE_VARIANTS,
  TEAM_ROLE_OPTIONS,
  type TeamRole,
} from "@/lib/permissions";

export const JOB_TITLE_OPTIONS = [
  "Gestionnaire de commandes",
  "Responsable catalogue",
  "Service client",
  "Livreur",
  "Responsable logistique",
  "Directeur",
] as const;
