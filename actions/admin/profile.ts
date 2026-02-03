"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { initAuth } from "@/lib/auth";
import { execute, queryFirst } from "@/lib/db";
import { getR2 } from "@/lib/cloudflare/context";
import type { ActionResult } from "@/lib/utils";

const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Minimum 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export async function updateTeamProfile(
  input: z.infer<typeof profileSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const { firstName, lastName, phone, jobTitle } = parsed.data;
  const fullName = `${firstName} ${lastName}`;

  // Update user table (name)
  const auth = await initAuth();
  await auth.api.updateUser({
    headers: await headers(),
    body: { name: fullName },
  });

  // Update team_members table
  await execute(
    `UPDATE team_members
     SET first_name = ?, last_name = ?, phone = ?, job_title = ?, updated_at = datetime('now')
     WHERE user_id = ?`,
    [firstName, lastName, phone ?? null, jobTitle ?? null, session.user.id]
  );

  revalidatePath("/profile");
  return { success: true };
}

export async function changeTeamPassword(
  input: z.infer<typeof passwordSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
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

export async function uploadTeamAvatar(formData: FormData): Promise<ActionResult> {
  const session = await requireAdmin();

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier sélectionné" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Format non supporté (JPG, PNG, WebP uniquement)" };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Fichier trop volumineux (max 2 Mo)" };
  }

  try {
    const r2 = await getR2();
    const ext = file.name.split(".").pop() || "jpg";
    const key = `avatars/team/${session.user.id}.${ext}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await r2.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    // Get the public URL (assuming R2 bucket has public access or custom domain)
    const avatarUrl = `/api/images/${key}`;

    // Update team_members table
    await execute(
      `UPDATE team_members SET avatar_url = ?, updated_at = datetime('now') WHERE user_id = ?`,
      [avatarUrl, session.user.id]
    );

    // Also update user image in auth table
    const auth = await initAuth();
    await auth.api.updateUser({
      headers: await headers(),
      body: { image: avatarUrl },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Avatar upload error:", error);
    return { success: false, error: "Erreur lors de l'upload" };
  }
}

export async function removeTeamAvatar(): Promise<ActionResult> {
  const session = await requireAdmin();

  try {
    // Get current avatar to delete from R2
    const member = await queryFirst<{ avatar_url: string | null }>(
      "SELECT avatar_url FROM team_members WHERE user_id = ?",
      [session.user.id]
    );

    if (member?.avatar_url) {
      const r2 = await getR2();
      const key = member.avatar_url.replace("/api/images/", "");
      await r2.delete(key);
    }

    // Clear avatar URL in database
    await execute(
      `UPDATE team_members SET avatar_url = NULL, updated_at = datetime('now') WHERE user_id = ?`,
      [session.user.id]
    );

    // Also clear user image in auth table
    const auth = await initAuth();
    await auth.api.updateUser({
      headers: await headers(),
      body: { image: null },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Avatar removal error:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}
