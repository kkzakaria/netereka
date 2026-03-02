"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "agent" | "admin" | "super_admin";
};

const AdminSessionUserContext = createContext<AdminSessionUser | null>(null);

export function AdminSessionUserProvider({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: ReactNode;
}) {
  return (
    <AdminSessionUserContext.Provider value={user}>
      {children}
    </AdminSessionUserContext.Provider>
  );
}

export function useAdminSessionUser(): AdminSessionUser {
  const ctx = useContext(AdminSessionUserContext);
  if (!ctx) {
    throw new Error("useAdminSessionUser must be used within an AdminSessionUserProvider");
  }
  return ctx;
}
