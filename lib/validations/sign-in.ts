import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export type SignInValues = z.infer<typeof signInSchema>;
