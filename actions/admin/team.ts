"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import type { ActionResult } from "@/lib/utils";
import {
  type TeamRole,
  type Permission,
  DEFAULT_PERMISSIONS,
  canManageRole,
} from "@/lib/permissions";

const idSchema = z.string().min(1, "ID requis");

const teamRoleSchema = z.enum(
  ["admin", "super_admin", "delivery", "support", "accountant"],
  { message: "Rôle invalide" }
);

const permissionSchema = z.array(z.string());

const createTeamMemberSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe: minimum 8 caractères"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  role: teamRoleSchema,
  jobTitle: z.string().optional(),
  permissions: permissionSchema.optional(),
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

  const { email, password, firstName, lastName, phone, role, jobTitle, permissions } = parsed.data;

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

  // Determine permissions: use provided or defaults
  const finalPermissions =
    permissions && permissions.length > 0
      ? permissions
      : DEFAULT_PERMISSIONS[role as TeamRole] || [];

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

  // Create team member profile with permissions
  await execute(
    `INSERT INTO team_members (id, user_id, first_name, last_name, phone, job_title, permissions, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    [
      teamMemberId,
      userId,
      firstName,
      lastName,
      phone ?? null,
      jobTitle ?? null,
      JSON.stringify(finalPermissions),
    ]
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
  newRole: TeamRole,
  newPermissions?: Permission[]
): Promise<ActionResult> {
  const session = await requireAdmin();
  const currentRole = session.user.role as TeamRole;

  // Validate role
  const roleResult = teamRoleSchema.safeParse(newRole);
  if (!roleResult.success) {
    return { success: false, error: roleResult.error.issues[0].message };
  }

  // Check permission to manage this role
  if (!canManageRole(currentRole, newRole)) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de gérer ce rôle",
    };
  }

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists and get current role
  const member = await queryFirst<{ id: string; user_id: string; role: string }>(
    `SELECT tm.id, tm.user_id, u.role
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Check if manager can manage target's current role
  if (!canManageRole(currentRole, member.role as TeamRole)) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de modifier ce membre",
    };
  }

  // Prevent self-demotion
  if (member.user_id === session.user.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas modifier votre propre rôle",
    };
  }

  // Update role in user table
  await execute(
    `UPDATE "user" SET role = ?, updatedAt = datetime('now') WHERE id = ?`,
    [roleResult.data, member.user_id]
  );

  // Update permissions in team_members table
  const finalPermissions = newPermissions ?? DEFAULT_PERMISSIONS[newRole] ?? [];
  await execute(
    `UPDATE team_members SET permissions = ?, updated_at = datetime('now') WHERE id = ?`,
    [JSON.stringify(finalPermissions), memberId]
  );

  revalidatePath("/team");
  revalidatePath(`/team/${memberId}`);

  return { success: true };
}

export async function updateTeamMemberPermissions(
  memberId: string,
  permissions: Permission[]
): Promise<ActionResult> {
  const session = await requireAdmin();
  const currentRole = session.user.role as TeamRole;

  // Only super_admin and admin can update permissions
  if (!canManageRole(currentRole, "admin")) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de modifier les permissions",
    };
  }

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists and get their role
  const member = await queryFirst<{ id: string; user_id: string; role: string }>(
    `SELECT tm.id, tm.user_id, u.role
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Can't modify permissions of someone you can't manage
  if (!canManageRole(currentRole, member.role as TeamRole)) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de modifier ce membre",
    };
  }

  // Prevent modifying own permissions
  if (member.user_id === session.user.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas modifier vos propres permissions",
    };
  }

  await execute(
    `UPDATE team_members SET permissions = ?, updated_at = datetime('now') WHERE id = ?`,
    [JSON.stringify(permissions), memberId]
  );

  revalidatePath("/team");
  revalidatePath(`/team/${memberId}`);

  return { success: true };
}

export async function toggleTeamMemberActive(
  memberId: string
): Promise<ActionResult> {
  const session = await requireAdmin();
  const currentRole = session.user.role as TeamRole;

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists and get current status and role
  const member = await queryFirst<{ id: string; user_id: string; is_active: number; role: string }>(
    `SELECT tm.id, tm.user_id, tm.is_active, u.role
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Check if manager can manage this member's role
  if (!canManageRole(currentRole, member.role as TeamRole)) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de modifier ce membre",
    };
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
  const currentRole = session.user.role as TeamRole;

  // Only super_admin can delete team members
  if (currentRole !== "super_admin") {
    return {
      success: false,
      error: "Seuls les super administrateurs peuvent supprimer des membres",
    };
  }

  const idResult = idSchema.safeParse(memberId);
  if (!idResult.success) {
    return { success: false, error: "ID membre invalide" };
  }

  // Check if member exists and get their role
  const member = await queryFirst<{ id: string; user_id: string; role: string }>(
    `SELECT tm.id, tm.user_id, u.role
     FROM team_members tm
     JOIN "user" u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [memberId]
  );

  if (!member) {
    return { success: false, error: "Membre introuvable" };
  }

  // Check if can manage this role
  if (!canManageRole(currentRole, member.role as TeamRole)) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de supprimer ce membre",
    };
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
