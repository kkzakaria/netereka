import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().min(1, "Libellé requis").max(50),
  fullName: z.string().min(2, "Nom complet requis").max(100),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s\-]/g, ""))
    .pipe(
      z.string().regex(/^(\+225)?[0-9]{10}$/, "Numéro ivoirien invalide (10 chiffres, optionnel +225)")
    ),
  street: z.string().min(3, "Adresse requise").max(200),
  commune: z.string().min(1, "Commune requise"),
  instructions: z.string().max(500).optional(),
});

export type AddressInput = z.input<typeof addressSchema>;
