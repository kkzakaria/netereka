import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis"),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "Le prénom est requis")
      .max(50, "Le prénom est trop long"),
    lastName: z
      .string()
      .min(1, "Le nom est requis")
      .max(50, "Le nom est trop long"),
    email: z
      .string()
      .min(1, "L'email est requis")
      .email("Email invalide"),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
    confirmPassword: z
      .string()
      .min(1, "La confirmation est requise"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Email invalide"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
      .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
    confirmPassword: z
      .string()
      .min(1, "La confirmation est requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
