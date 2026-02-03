"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

const teamRoleSchema = z.enum(["admin", "super_admin"], {
  message: "Rôle invalide",
});

const createTeamMemberSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe: minimum 8 caractères"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  role: teamRoleSchema,
  jobTitle: z.string().optional(),
});

const updateTeamMemberSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
});

export async function createTeamMember(
  data: z.infer<typeof createTeamMemberSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();

  // Only super_admin can create team members
  if (session.user.role !== "super_admin") {
    return {
      success: false,
      error: "Seuls les super administrateurs peuvent créer des membres d'équipe",
    };
  }

  const parsed = createTeamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const { email, password, firstName, lastName, phone, role, jobTitle } = parsed.data;

  // Check if email already exists
  const existingUser = await queryFirst<{ id: string }>(
    'SELECT id FROM "user" WHERE email = ?',
    [email]
  );

  if (existingUser) {
    return { success: false, error: "Un compte existe déjà avec cet email" };
  }

  // Generate IDs
  const userId = crypto.randomUUID();
  const teamMemberId = crypto.randomUUID();

  // Hash password using Web Crypto API (compatible with Cloudflare Workers)
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", passwordData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Create user in better-auth table
  await execute(
    `INSERT INTO "user" (id, email, name, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [userId, email, `${firstName} ${lastName}`, role]
  );

  // Create account for password auth
  await execute(
    `INSERT INTO account (id, userId, accountId, providerId, password, createdAt, updatedAt)
     VALUES (?, ?, ?, 'credential', ?, datetime('now'), datetime('now'))`,
    [crypto.randomUUID(), userId, userId, hashedPassword]
  );

  // Create team member profile
  await execute(
    `INSERT INTO team_members (id, user_id, first_name, last_name, phone, job_title, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    [teamMemberId, userId, firstName, lastName, phone ?? null, jobTitle ?? null]
  );

  revalidatePath("/team");

  return { success: true, id: teamMemberId };
}

export async function updateTeamMember(
  memberId: string,
  data: z.infer<typeof updateTeamMemberSchema>
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  const parsed = updateTeamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const { firstName, lastName, phone, jobTitle } = parsed.data;

  // Check if member exists
  const member = await queryFirst<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM team_members WHERE id = ?",
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Update team member profile
  await execute(
    `UPDATE team_members
     SET first_name = ?, last_name = ?, phone = ?, job_title = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [firstName, lastName, phone ?? null, jobTitle ?? null, memberId]
  );

  // Update name in user table
  await execute(
    `UPDATE "user" SET name = ?, updatedAt = datetime('now') WHERE id = ?`,
    [`${firstName} ${lastName}`, member.user_id]
  );

  revalidatePath("/team");
  revalidatePath(`/team/${memberId}`);

  return { success: true };
}

export async function updateTeamMemberRole(
  memberId: string,
  newRole: "admin" | "super_admin"
): Promise<ActionResult> {
  const session = await requireAdmin();

  // Only super_admin can change roles
  if (session.user.role !== "super_admin") {
    return {
      success: false,
      error: "Seuls les super administrateurs peuvent modifier les rôles",
    };
  }

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  const roleResult = teamRoleSchema.safeParse(newRole);
  if (!roleResult.success) {
    return { success: false, error: roleResult.error.issues[0].message };
  }

  // Check if member exists
  const member = await queryFirst<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM team_members WHERE id = ?",
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Prevent self-demotion
  if (member.user_id === session.user.id && newRole !== "super_admin") {
    return {
      success: false,
      error: "Vous ne pouvez pas modifier votre propre rôle",
    };
  }

  await execute(
    `UPDATE "user" SET role = ?, updatedAt = datetime('now') WHERE id = ?`,
    [roleResult.data, member.user_id]
  );

  revalidatePath("/team");
  revalidatePath(`/team/${memberId}`);

  return { success: true };
}

export async function toggleTeamMemberActive(
  memberId: string
): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists and get current status
  const member = await queryFirst<{ id: string; user_id: string; is_active: number }>(
    "SELECT id, user_id, is_active FROM team_members WHERE id = ?",
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Prevent self-deactivation
  if (member.user_id === session.user.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas désactiver votre propre compte",
    };
  }

  const newActive = member.is_active === 1 ? 0 : 1;

  await execute(
    "UPDATE team_members SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
    [newActive, memberId]
  );

  revalidatePath("/team");
  revalidatePath(`/team/${memberId}`);

  return { success: true };
}

export async function deleteTeamMember(memberId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  // Only super_admin can delete team members
  if (session.user.role !== "super_admin") {
    return {
      success: false,
      error: "Seuls les super administrateurs peuvent supprimer des membres",
    };
  }

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists
  const member = await queryFirst<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM team_members WHERE id = ?",
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Prevent self-deletion
  if (member.user_id === session.user.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas supprimer votre propre compte",
    };
  }

  // Delete user (cascades to team_members and account)
  await execute('DELETE FROM "user" WHERE id = ?', [member.user_id]);

  revalidatePath("/team");

  return { success: true };
}
