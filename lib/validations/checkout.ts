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
      .transform((v) => {
        const cleaned = v.replace(/[\s\-]/g, "");
        return cleaned === "" ? undefined : cleaned;
      })
      .pipe(
        z.string().regex(/^(\+225)?[0-9]{10}$/, "Numero ivoirien invalide (10 chiffres, optionnel +225)").optional()
      )
      .optional(),
    street: z.string().min(3).max(200).optional(),
    commune: z.string().min(1, "La commune est requise"),

    instructions: z.string().max(500).optional(),
    saveAddress: z.boolean().optional().default(false),
    addressLabel: z.string().max(50).optional(),

    promoCode: z.string().max(50).optional(),

    // Cap the number of distinct line items to mirror the cart's MAX_CART_ITEMS
    // (actions/cart.ts). Without this, a direct createOrder call could submit an
    // unbounded items array, producing an oversized IN (...) query and D1 batch.
    items: z.array(cartItemSchema).min(1, "Le panier est vide").max(50, "Trop d'articles dans le panier"),
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
