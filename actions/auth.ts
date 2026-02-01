"use server";

import { redirect } from "next/navigation";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { getUserByEmail, createUser } from "@/lib/db/users";
import { verifyTurnstile } from "@/lib/auth/turnstile";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

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

  const user = await getUserByEmail(result.data.email);
  if (!user || !user.password_hash) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const valid = await verifyPassword(result.data.password, user.password_hash);
  if (!valid) {
    return { error: "Email ou mot de passe incorrect" };
  }

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
    return { error: "Un compte avec cet email existe déjà" };
  }

  const passwordHash = await hashPassword(result.data.password);
  const userId = await createUser({
    email: result.data.email,
    password_hash: passwordHash,
    first_name: result.data.firstName,
    last_name: result.data.lastName,
    phone: result.data.phone || null,
  });

  await createSession(userId);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/auth/login");
}
