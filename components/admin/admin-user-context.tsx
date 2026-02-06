"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "customer" | "admin" | "super_admin";
};

const AdminUserContext = createContext<AdminUser | null>(null);

export function AdminUserProvider({
  user,
  children,
}: {
  user: AdminUser;
  children: ReactNode;
}) {
  return (
    <AdminUserContext.Provider value={user}>
      {children}
    </AdminUserContext.Provider>
  );
}

export function useAdminUser(): AdminUser {
  const ctx = useContext(AdminUserContext);
  if (!ctx) {
    throw new Error("useAdminUser must be used within an AdminUserProvider");
  }
  return ctx;
}
