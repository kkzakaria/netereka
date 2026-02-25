import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().min(1, "Le nom est requis."),
    email: z.string().email("Adresse email invalide."),
    phone: z
      .string()
      .regex(
        /^\+225\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$|^\+225\d{10}$/,
        "Format : +225 07 00 00 00 00 ou +2250700000000"
      ),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
