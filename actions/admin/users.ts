"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { initAuth } from "@/lib/auth";
import { batch } from "@/lib/db";
import { prepareAuditLog } from "@/lib/db/admin/audit-log";
import type { ActionResult } from "@/lib/types/actions";

const createAdminUserSchema = z.object({
  name: z.string().min(2, "Nom requis (minimum 2 caractères)"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (minimum 8 caractères)"),
  role: z.enum(["agent", "admin", "super_admin"], { message: "Rôle invalide" }),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export async function createAdminUser(input: CreateAdminUserInput): Promise<ActionResult> {
  const session = await requireSuperAdmin();

  const parsed = createAdminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await initAuth();
  const createUserBody = {
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role,
    data: { emailVerified: true },
  };
  let result;
  try {
    result = await auth.api.createUser({
      body: createUserBody as never, // better-auth createUser body type is overly strict
      headers: await headers(),
    });
  } catch (error) {
    console.error("[admin/users] createUser failed:", error);
    return { success: false, error: "Erreur lors de la création du compte" };
  }

  if (!result?.user) {
    return { success: false, error: "Erreur lors de la création du compte" };
  }

  try {
    const auditStmt = await prepareAuditLog({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "user.created",
      targetType: "user",
      targetId: result.user.id,
      details: JSON.stringify({ role: parsed.data.role, email: parsed.data.email }),
    });
    await batch([auditStmt]);
  } catch (auditError) {
    console.error("[admin/users] audit log failed after createUser:", auditError);
  }

  revalidatePath("/users");
  return { success: true };
}
