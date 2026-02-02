"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { queryFirst } from "@/lib/db";
import { getDeliveryZoneByCommune } from "@/lib/db/delivery-zones";
import { getAddressById, createAddress } from "@/lib/db/addresses";
import { createOrderWithItems, generateOrderNumber } from "@/lib/db/orders";
import type { Product, ProductVariant, PromoCode } from "@/lib/db/types";

// ---------- promo code validation ----------

interface PromoResult {
  valid: boolean;
  discount: number;
  promoCodeId: string | null;
  label: string | null;
  error: string | null;
}

export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<PromoResult> {
  await requireAuth();

  if (!code.trim()) {
    return { valid: false, discount: 0, promoCodeId: null, label: null, error: "Veuillez saisir un code promo" };
  }

  const promo = await queryFirst<PromoCode>(
    "SELECT * FROM promo_codes WHERE code = ? AND is_active = 1",
    [code.trim().toUpperCase()]
  );

  if (!promo) {
    return { valid: false, discount: 0, promoCodeId: null, label: null, error: "Code promo invalide" };
  }

  const now = Date.now();
  if (promo.starts_at && now < new Date(promo.starts_at).getTime()) {
    return { valid: false, discount: 0, promoCodeId: null, label: null, error: "Ce code promo n'est pas encore actif" };
  }
  if (promo.expires_at && now > new Date(promo.expires_at).getTime()) {
    return { valid: false, discount: 0, promoCodeId: null, label: null, error: "Ce code promo a expire" };
  }
  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return { valid: false, discount: 0, promoCodeId: null, label: null, error: "Ce code promo a atteint sa limite d'utilisation" };
  }
  if (promo.min_order_amount && subtotal < promo.min_order_amount) {
    return {
      valid: false,
      discount: 0,
      promoCodeId: null,
      label: null,
      error: `Montant minimum de commande: ${promo.min_order_amount} FCFA`,
    };
  }

  const discount =
    promo.discount_type === "percentage"
      ? Math.round((subtotal * promo.discount_value) / 100)
      : promo.discount_value;

  const label =
    promo.discount_type === "percentage"
      ? `-${promo.discount_value}%`
      : `-${promo.discount_value} FCFA`;

  return { valid: true, discount, promoCodeId: promo.id, label, error: null };
}

// ---------- main order creation ----------

interface CreateOrderResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const session = await requireAuth();
  const userId = session.user.id;

  // 1. Validate
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Donnees invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  // 2. Resolve address
  let addressStreet: string;
  let addressFullName: string;
  let addressPhone: string;
  let addressCommune = data.commune;

  if (data.savedAddressId) {
    const saved = await getAddressById(data.savedAddressId, userId);
    if (!saved) {
      return { success: false, error: "Adresse introuvable" };
    }
    addressStreet = saved.street;
    addressFullName = saved.full_name;
    addressPhone = saved.phone;
    addressCommune = saved.commune;
  } else {
    addressStreet = data.street!;
    addressFullName = data.fullName!;
    addressPhone = data.phone!;
  }

  // 3. Get delivery zone
  const zone = await getDeliveryZoneByCommune(addressCommune);
  if (!zone) {
    return { success: false, error: "Zone de livraison non disponible pour cette commune" };
  }

  // 4. Validate each cart item against DB
  const validatedItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
  }> = [];

  for (const cartItem of data.items) {
    const product = await queryFirst<Product>(
      "SELECT * FROM products WHERE id = ? AND is_active = 1",
      [cartItem.productId]
    );
    if (!product) {
      return { success: false, error: `Produit introuvable ou indisponible` };
    }

    if (cartItem.variantId) {
      const variant = await queryFirst<ProductVariant>(
        "SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1",
        [cartItem.variantId, cartItem.productId]
      );
      if (!variant) {
        return { success: false, error: `Variante introuvable pour ${product.name}` };
      }
      if (variant.stock_quantity < cartItem.quantity) {
        return {
          success: false,
          error: `Stock insuffisant pour ${product.name} - ${variant.name} (${variant.stock_quantity} disponible(s))`,
        };
      }
      validatedItems.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        unitPrice: variant.price,
        quantity: cartItem.quantity,
      });
    } else {
      if (product.stock_quantity < cartItem.quantity) {
        return {
          success: false,
          error: `Stock insuffisant pour ${product.name} (${product.stock_quantity} disponible(s))`,
        };
      }
      validatedItems.push({
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        unitPrice: product.base_price,
        quantity: cartItem.quantity,
      });
    }
  }

  // 5. Calculate totals
  const subtotal = validatedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const deliveryFee = zone.fee;

  // 6. Validate promo code if provided
  let discountAmount = 0;
  let promoCodeId: string | null = null;

  if (data.promoCode) {
    const promoResult = await validatePromoCode(data.promoCode, subtotal);
    if (!promoResult.valid) {
      return { success: false, error: promoResult.error ?? "Code promo invalide" };
    }
    discountAmount = promoResult.discount;
    promoCodeId = promoResult.promoCodeId;
  }

  const total = subtotal + deliveryFee - discountAmount;

  // 7. Optionally save new address
  if (!data.savedAddressId && data.saveAddress) {
    await createAddress({
      userId,
      label: data.addressLabel || "Domicile",
      fullName: addressFullName,
      phone: addressPhone,
      street: addressStreet,
      commune: addressCommune,
      zoneId: zone.id,
      instructions: data.instructions ?? null,
    });
  }

  // 8. Estimated delivery
  const estimatedDate = new Date();
  estimatedDate.setHours(estimatedDate.getHours() + zone.estimated_hours);
  const estimatedDelivery = estimatedDate.toISOString();

  // 9. Create order atomically
  const orderNumber = await generateOrderNumber();
  const deliveryAddressFormatted = `${addressFullName}, ${addressStreet}, ${addressCommune}, Abidjan`;

  try {
    await createOrderWithItems(
      {
        userId,
        orderNumber,
        subtotal,
        deliveryFee,
        discountAmount,
        total,
        promoCodeId,
        deliveryAddress: deliveryAddressFormatted,
        deliveryCommune: addressCommune,
        deliveryPhone: addressPhone,
        deliveryInstructions: data.instructions ?? null,
        estimatedDelivery,
      },
      validatedItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      }))
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur lors de la creation de la commande";
    return { success: false, error: message };
  }

  redirect(`/checkout/success?order=${orderNumber}`);
}
