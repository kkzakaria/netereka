"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { getUserByEmail, createUser } from "@/lib/db/users";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { checkRateLimit, recordAttempt, resetRateLimit } from "@/lib/auth/rate-limit";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const turnstileToken = formData.get("cf-turnstile-response") as string;
  if (!await verifyTurnstile(turnstileToken || "")) {
    return { error: "Vérification de sécurité échouée. Réessayez." };
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  // Rate limit by IP + email
  const ip = await getClientIp();
  const rateLimitKey = `${ip}:${result.data.email}`;
  const { allowed } = await checkRateLimit("login", rateLimitKey);
  if (!allowed) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }

  const user = await getUserByEmail(result.data.email);
  if (!user || !user.password_hash) {
    await recordAttempt("login", rateLimitKey);
    return { error: "Email ou mot de passe incorrect" };
  }

  const valid = await verifyPassword(result.data.password, user.password_hash);
  if (!valid) {
    await recordAttempt("login", rateLimitKey);
    return { error: "Email ou mot de passe incorrect" };
  }

  if (!user.is_verified) {
    return { error: "Veuillez vérifier votre email avant de vous connecter." };
  }

  // Reset rate limit on successful login
  await resetRateLimit("login", rateLimitKey);

  await createSession(user.id);
  redirect("/");
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const turnstileToken = formData.get("cf-turnstile-response") as string;
  if (!await verifyTurnstile(turnstileToken || "")) {
    return { error: "Vérification de sécurité échouée. Réessayez." };
  }

  // Rate limit registration by IP
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("register", ip);
  if (!allowed) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }

  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || "",
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const existing = await getUserByEmail(result.data.email);
  if (existing) {
    await recordAttempt("register", ip);
    return { error: "Un compte avec cet email existe déjà" };
  }

  const passwordHash = await hashPassword(result.data.password);
  const userId = await createUser({
    email: result.data.email,
    password_hash: passwordHash,
    first_name: result.data.firstName,
    last_name: result.data.lastName,
    phone: result.data.phone || null,
    // TODO: set to 0 and send verification email when notification system is ready
    is_verified: 1,
  });

  await createSession(userId);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/auth/login");
}

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const turnstileToken = formData.get("cf-turnstile-response") as string;
  if (!await verifyTurnstile(turnstileToken || "")) {
    return { error: "Vérification de sécurité échouée. Réessayez." };
  }

  const raw = { email: formData.get("email") as string };
  const result = forgotPasswordSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  // Rate limit by IP
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("forgot-password", ip);
  if (!allowed) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }

  await recordAttempt("forgot-password", ip);

  // Always return success to avoid email enumeration
  // TODO: send password reset email via Queues when notification system is ready
  return { success: true };
}
