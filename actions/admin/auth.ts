"use server";

import { headers } from "next/headers";
import { initAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/utils";

/**
 * Verifies the currently authenticated user has admin or super_admin role.
 * Called after client-side signIn to confirm access server-side.
 */
export async function verifyAdminRole(): Promise<ActionResult> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: "Non authentifié." };
  }

  const role = session.user.role;
  if (role !== "admin" && role !== "super_admin") {
    // Sign out non-admin user server-side
    await auth.api.signOut({ headers: await headers() });
    return {
      success: false,
      error: "Accès refusé. Ce portail est réservé aux administrateurs.",
    };
  }

  return { success: true };
}
