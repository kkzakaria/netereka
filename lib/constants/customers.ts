import type { UserRole } from "@/lib/db/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Client",
  admin: "Administrateur",
  super_admin: "Super Administrateur",
};

export const ROLE_VARIANTS: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  customer: "secondary",
  admin: "default",
  super_admin: "destructive",
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Client" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super Administrateur" },
];

export const ADMIN_ROLE_OPTIONS: { value: "admin" | "super_admin"; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super Administrateur" },
];

export const ADMIN_ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  ...ADMIN_ROLE_OPTIONS,
];

/** Returns "client" for customers, "utilisateur" for admins */
export function getUserTypeLabel(role: UserRole): string {
  return role === "customer" ? "client" : "utilisateur";
}
