"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { initAuth } from "@/lib/auth";
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from "@/lib/validations/account";

interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  await requireAuth();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const auth = await initAuth();
  await auth.api.updateUser({
    headers: await headers(),
    body: {
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/account");
  return { success: true };
}

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  await requireAuth();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const auth = await initAuth();
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
    });
  } catch {
    return { success: false, error: "Mot de passe actuel incorrect" };
  }

  return { success: true };
}
