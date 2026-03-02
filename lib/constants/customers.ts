import type { UserRole } from "@/lib/db/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Client",
  agent: "Agent",
  admin: "Administrateur",
  super_admin: "Super Administrateur",
};

export const ROLE_VARIANTS: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  customer: "secondary",
  agent: "outline",
  admin: "default",
  super_admin: "destructive",
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Client" },
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super Administrateur" },
];

// Options for staff management only (no customer)
export const STAFF_ROLE_OPTIONS: { value: "agent" | "admin" | "super_admin"; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super Administrateur" },
];

export const STAFF_ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  ...STAFF_ROLE_OPTIONS,
];

/** Returns "client" for customers, "utilisateur" for staff */
export function getUserTypeLabel(role: UserRole): string {
  return role === "customer" ? "client" : "utilisateur";
}
