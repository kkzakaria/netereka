import { z } from "zod";

export const storeSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200, "200 caractères maximum"),
  address: z.string().min(1, "L'adresse est requise").max(500, "500 caractères maximum"),
  google_maps_url: z
    .string()
    .min(1, "L'URL Google Maps est requise")
    .url("URL invalide")
    .refine(
      (val) => val.includes("google.com/maps") || val.includes("goo.gl/maps"),
      "L'URL doit être un lien Google Maps"
    ),
  phone: z.string().max(30).optional().default(""),
  email: z
    .string()
    .max(200)
    .optional()
    .default("")
    .transform((v) => v.trim())
    .pipe(
      z.string().refine(
        (v) => v === "" || z.string().email().safeParse(v).success,
        "Email invalide"
      )
    ),
  opening_hours: z.string().max(200).optional().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export type StoreInput = z.input<typeof storeSchema>;
