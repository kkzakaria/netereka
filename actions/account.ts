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

  const auth = await initAuth();
  let responseHeaders: Headers;
  try {
    ({ headers: responseHeaders } = await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Changer son mot de passe est le geste de reprise de contrôle après
        // compromission : laisser les autres sessions actives le vide de sens.
        revokeOtherSessions: true,
      },
      returnHeaders: true,
    }));
  } catch {
    return { success: false, error: "Mot de passe actuel incorrect" };
  }

  // À partir d'ici, le mot de passe a déjà été changé et toutes les sessions
  // ont déjà été supprimées côté serveur : revokeOtherSessions fait tourner
  // TOUTES les sessions de l'utilisateur, y compris celle de l'appelant, et
  // better-auth en réémet une nouvelle via responseHeaders. Une erreur dans
  // ce qui suit ne doit donc jamais être signalée comme « mot de passe
  // incorrect » — ce serait faire croire à l'appelant que rien ne s'est
  // passé, alors que son mot de passe a changé et que sa session a été
  // révoquée.
  const setCookieHeader = responseHeaders.get("set-cookie");
  if (setCookieHeader) {
    try {
      const cookieStore = await cookies();
      parseSetCookieHeader(setCookieHeader).forEach((value, key) => {
        if (!key) return;
        cookieStore.set(key, value.value, toCookieOptions(value));
      });
    } catch (error) {
      // Même posture que le plugin nextCookies() en amont : Next.js lève une
      // exception depuis ResponseCookies.set en dehors d'un contexte de
      // mutation autorisé. Le changement de mot de passe et la rotation de
      // session ont déjà réussi côté serveur ; échouer à rejouer le nouveau
      // cookie ici ne doit pas être remonté comme un échec, mais cela laisse
      // le navigateur de l'appelant pointer vers une session morte — journaliser
      // pour que ce ne soit pas invisible.
      console.error("[changePassword] échec de réapplication du cookie de session", error);
    }
  } else {
    // revokeOtherSessions est désormais toujours à true, donc l'endpoint
    // better-auth appelle toujours setSessionCookie : l'absence d'un
    // set-cookie signifie que la rotation n'a pas été exposée et que le
    // cookie de l'appelant pointe maintenant vers une session supprimée.
    // Pas fatal (le changement de mot de passe a bien réussi), mais ne doit
    // pas rester silencieux.
    console.warn("[changePassword] revokeOtherSessions n'a produit aucun set-cookie à réappliquer");
  }

  return { success: true };
}
