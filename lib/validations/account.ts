import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s\-]/g, ""))
    .pipe(
      z.string().regex(/^(\+225)?[0-9]{10}$/, "Numéro ivoirien invalide (10 chiffres, optionnel +225)")
    ),
});

export type ProfileInput = z.input<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
