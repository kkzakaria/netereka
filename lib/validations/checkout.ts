import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable(),
  quantity: z.number().int().min(1).max(10),
});

export const checkoutSchema = z
  .object({
    // Address: either saved or new
    savedAddressId: z.string().optional(),
    fullName: z.string().min(2).max(100).optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "Numero de telephone invalide")
      .optional(),
    street: z.string().min(3).max(200).optional(),
    commune: z.string().min(1, "La commune est requise"),

    instructions: z.string().max(500).optional(),
    saveAddress: z.boolean().optional().default(false),
    addressLabel: z.string().max(50).optional(),

    promoCode: z.string().max(50).optional(),

    items: z.array(cartItemSchema).min(1, "Le panier est vide"),
  })
  .refine(
    (data) => {
      if (data.savedAddressId) return true;
      return data.fullName && data.phone && data.street;
    },
    {
      message: "Veuillez remplir les champs d'adresse ou selectionner une adresse enregistree",
      path: ["fullName"],
    }
  );

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutOutput = z.infer<typeof checkoutSchema>;
