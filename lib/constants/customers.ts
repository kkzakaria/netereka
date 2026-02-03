import type { UserRole } from "@/lib/permissions";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Client",
  super_admin: "Super Admin",
  admin: "Admin",
  delivery: "Livreur",
  support: "Service Client",
  accountant: "Comptable",
};

export const ROLE_VARIANTS: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  customer: "secondary",
  super_admin: "destructive",
  admin: "default",
  delivery: "secondary",
  support: "secondary",
  accountant: "outline",
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Client" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "delivery", label: "Livreur" },
  { value: "support", label: "Service Client" },
  { value: "accountant", label: "Comptable" },
];
