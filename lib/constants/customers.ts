import type { UserRole } from "@/lib/db/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Client",
  admin: "Admin",
  super_admin: "Super Admin",
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
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];
