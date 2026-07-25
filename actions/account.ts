"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { requireAuth } from "@/lib/auth/guards";
import { initAuth } from "@/lib/auth";
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from "@/lib/validations/account";
import type { ActionResult } from "@/lib/types/actions";

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
    const { headers: responseHeaders } = await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Changer son mot de passe est le geste de reprise de contrôle après
        // compromission : laisser les autres sessions actives le vide de sens.
        revokeOtherSessions: true,
      },
      returnHeaders: true,
    });

    // revokeOtherSessions rotates every session for the user, including the
    // caller's, and better-auth reissues a fresh one on responseHeaders. This
    // app has no nextCookies plugin to forward that Set-Cookie automatically,
    // so without this the browser that just changed its password would keep
    // pointing at a session row that no longer exists and get signed out on
    // the next cache-bypassing check — apply it the same way nextCookies does.
    const setCookieHeader = responseHeaders.get("set-cookie");
    if (setCookieHeader) {
      const cookieStore = await cookies();
      parseSetCookieHeader(setCookieHeader).forEach((value, key) => {
        if (!key) return;
        cookieStore.set(key, value.value, toCookieOptions(value));
      });
    }
  } catch {
    return { success: false, error: "Mot de passe actuel incorrect" };
  }

  return { success: true };
}
