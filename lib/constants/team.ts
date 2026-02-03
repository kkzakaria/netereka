export const TEAM_ROLE_LABELS: Record<"admin" | "super_admin", string> = {
  admin: "Admin",
  super_admin: "Super Admin",
};

export const TEAM_ROLE_VARIANTS: Record<
  "admin" | "super_admin",
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "default",
  super_admin: "destructive",
};

export const TEAM_ROLE_OPTIONS: { value: "admin" | "super_admin"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export const JOB_TITLE_OPTIONS = [
  "Gestionnaire de commandes",
  "Responsable catalogue",
  "Service client",
  "Livreur",
  "Responsable logistique",
  "Directeur",
] as const;
