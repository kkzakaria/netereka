"use server";

import { requireAuth } from "@/lib/auth/guards";
import { checkoutSchema, type CheckoutInput, type CheckoutOutput } from "@/lib/validations/checkout";
import { query, queryFirst } from "@/lib/db";
import { getKV } from "@/lib/cloudflare/context";
import { checkOrderRateLimit } from "@/lib/rate-limit/orders";
import { checkPromoRateLimit } from "@/lib/rate-limit/promo";
import { getDeliveryZoneByCommune } from "@/lib/db/delivery-zones";
import { getAddressById, createAddress } from "@/lib/db/addresses";
import {
  createOrderWithItems,
  countPendingOrdersForUser,
  MAX_PENDING_ORDERS_PER_USER,
} from "@/lib/db/orders";
import { generateOrderNumber } from "@/lib/utils/order-number";
import type { Product, ProductVariant, PromoCode } from "@/lib/db/types";
import { notifyOrderConfirmation } from "@/lib/notifications";
import {
  validatePromoEligibility,
  calculateDiscount,
  calculateOrderTotal,
  calculateSubtotal,
  resolveOrderLine,
  countActiveVariantsByProduct,
} from "@/lib/utils/checkout";

// ---------- internal promo validation (no auth check) ----------

interface PromoResult {
  valid: boolean;
  discount: number;
  promoCodeId: string | null;
  label: string | null;
  error: string | null;
}

function invalidPromo(error: string): PromoResult {
  return { valid: false, discount: 0, promoCodeId: null, label: null, error };
}

// A code that doesn't exist, one that's expired, one that hasn't started
// yet, one that hit its usage cap, and one whose minimum order isn't met
// all resolve through validatePromoEligibility/queryFirst below with a
// distinct, specific message each. Surfacing any of that distinction to the
// caller turns validatePromoCode into an oracle over the promo_codes table:
// an authenticated customer could tell "this code doesn't exist" apart from
// "this code exists but isn't active yet", revealing unpublished campaigns
// and their eligibility thresholds one probe at a time. Collapsing every
// failure reason — including the rate-limit rejection below — onto this one
// string closes that channel. validatePromoEligibility itself still returns
// the specific reason (kept for its own unit tests and internal callers);
// it's only discarded here, at the boundary that talks back to the client.
const GENERIC_PROMO_ERROR = "Ce code promo n'est pas applicable à votre commande.";

async function resolvePromoCode(
  code: string,
  subtotal: number
): Promise<PromoResult> {
  // An empty/blank code never reaches the promo_codes table, so returning a
  // distinct message here doesn't leak anything about which codes exist —
  // the caller already knows, locally, whether they typed anything. The
  // storefront form also short-circuits on this before ever calling the
  // server action, so this is a defence-in-depth path, not the common case.
  if (!code.trim()) {
    return invalidPromo("Veuillez saisir un code promo");
  }

  const promo = await queryFirst<PromoCode>(
    "SELECT * FROM promo_codes WHERE code = ? AND is_active = 1",
    [code.trim().toUpperCase()]
  );

  if (!promo) return invalidPromo(GENERIC_PROMO_ERROR);

  const eligibilityError = validatePromoEligibility(promo, subtotal);
  if (eligibilityError) return invalidPromo(GENERIC_PROMO_ERROR);

  const { discount, label } = calculateDiscount(
    promo.discount_type,
    promo.discount_value,
    subtotal
  );

  return { valid: true, discount, promoCodeId: promo.id, label, error: null };
}

// ---------- public server action for promo validation ----------

export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<PromoResult> {
  const session = await requireAuth();

  // No limiter previously governed promo validation, so an authenticated
  // account could probe the promo namespace as fast as the network allowed.
  // Checked before the promo_codes lookup — a throttled call must return
  // the exact same GENERIC_PROMO_ERROR without ever touching the table,
  // otherwise the throttle's own rejection becomes a second oracle: a
  // distinct "too many attempts" reply would confirm that probing was being
  // counted, and a message that only appears once real lookups have run
  // would leak the same "code doesn't exist yet" timing this fix closes.
  // Ceiling is looser than order creation's (lib/rate-limit/promo.ts) since
  // trying a promo code is a legitimate action customers repeat often.
  const withinRateLimit = await checkPromoRateLimit(await getKV(), session.user.id);
  if (!withinRateLimit) {
    return invalidPromo(GENERIC_PROMO_ERROR);
  }

  return resolvePromoCode(code, subtotal);
}

// ---------- main order creation ----------

interface CreateOrderResult {
  success: boolean;
  orderNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const session = await requireAuth();
  const userId = session.user.id;

  // Fast-path cap on concurrently-open pending orders per user — cheap, good
  // UX (a customer who genuinely already has several orders pending gets a
  // clear message before spending effort on the rest of validation), but NOT
  // the authoritative enforcement: this is a plain read, so a burst of
  // parallel createOrder calls could all read the same under-cap count
  // before any of them writes. The actual guard against that race is the
  // atomic guarded INSERT inside createOrderWithItems (see its doc comment
  // in lib/db/orders.ts) — this check can only ever reject early or agree
  // with that guard, never let something through it would block.
  const pendingCount = await countPendingOrdersForUser(userId);
  if (pendingCount >= MAX_PENDING_ORDERS_PER_USER) {
    return {
      success: false,
      error:
        "Vous avez deja plusieurs commandes en attente de confirmation. Merci d'attendre leur traitement avant d'en passer une nouvelle.",
    };
  }

  // 1. Validate
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Donnees invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data: CheckoutOutput = parsed.data;

  // 2. Start products + variants fetch early (independent of address)
  const productIds = data.items.map((i) => i.productId);

  const placeholdersP = productIds.map(() => "?").join(",");
  const productsPromise = query<Product>(
    `SELECT * FROM products WHERE id IN (${placeholdersP}) AND is_active = 1`,
    productIds
  );
  // Fetch every active variant for every product in the cart — not just the
  // ones referenced by a variantId. This is what lets us compute each
  // product's activeVariantCount below without a second COUNT query, and it
  // guarantees a variant can only resolve for a product actually in this cart.
  const variantsPromise = query<ProductVariant>(
    `SELECT * FROM product_variants WHERE product_id IN (${placeholdersP}) AND is_active = 1`,
    productIds
  );

  // 3. Resolve address
  let addressStreet: string;
  let addressFullName: string;
  let addressPhone: string;
  let addressCommune = data.commune;
  let addressCity = "Abidjan";

  if (data.savedAddressId) {
    const saved = await getAddressById(data.savedAddressId, userId);
    if (!saved) {
      return { success: false, error: "Adresse introuvable" };
    }
    addressStreet = saved.street;
    addressFullName = saved.full_name;
    addressPhone = saved.phone;
    addressCommune = saved.commune;
    addressCity = saved.city;
  } else {
    addressStreet = data.street!;
    addressFullName = data.fullName!;
    addressPhone = data.phone!;
  }

  // 4. Get delivery zone
  const zone = await getDeliveryZoneByCommune(addressCommune);
  if (!zone) {
    return { success: false, error: "Zone de livraison non disponible pour cette commune" };
  }

  // 5. Await products + variants (started in step 2)
  const [products, variantsRaw] = await Promise.all([productsPromise, variantsPromise]);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const variantMap = new Map<string, ProductVariant>();
  for (const v of variantsRaw) variantMap.set(v.id, v);
  const activeVariantCountByProduct = countActiveVariantsByProduct(variantsRaw);

  // 6. Validate each cart item
  const validatedItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
  }> = [];

  for (const cartItem of data.items) {
    const product = productMap.get(cartItem.productId);
    if (!product) {
      return { success: false, error: "Produit introuvable ou indisponible" };
    }

    let variant: ProductVariant | null = null;
    if (cartItem.variantId) {
      const candidate = variantMap.get(cartItem.variantId);
      if (!candidate || candidate.product_id !== cartItem.productId) {
        return { success: false, error: `Variante introuvable pour ${product.name}` };
      }
      variant = candidate;
    }

    const result = resolveOrderLine({
      product: {
        name: product.name,
        base_price: product.base_price,
        stock_quantity: product.stock_quantity,
        activeVariantCount: activeVariantCountByProduct.get(product.id) ?? 0,
      },
      variant: variant
        ? { name: variant.name, price: variant.price, stock_quantity: variant.stock_quantity }
        : null,
      quantity: cartItem.quantity,
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    validatedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantName: variant?.name ?? null,
      unitPrice: result.unitPrice,
      quantity: cartItem.quantity,
    });
  }

  // 7. Calculate totals
  const subtotal = calculateSubtotal(validatedItems);
  const deliveryFee = zone.fee;

  // 8. Validate promo code if provided (internal call, no double auth)
  let discountAmount = 0;
  let promoCodeId: string | null = null;

  if (data.promoCode) {
    const promoResult = await resolvePromoCode(data.promoCode, subtotal);
    if (!promoResult.valid) {
      return { success: false, error: promoResult.error ?? "Code promo invalide" };
    }
    discountAmount = promoResult.discount;
    promoCodeId = promoResult.promoCodeId;
  }

  const total = calculateOrderTotal(subtotal, deliveryFee, discountAmount);

  // 9. Throttle: no limiter previously governed order creation — better-auth's
  //    rate limiting only covers /api/auth/* routes, never this Server Action.
  //    Keyed on userId alone (every caller is authenticated), not IP: see
  //    lib/rate-limit/orders.ts for why. Checked here — after every read-only
  //    validation step (schema, address lookup, delivery zone, product/
  //    variant/stock resolution, promo code) but strictly BEFORE the first
  //    persistent write (createAddress, right below) — rather than at the
  //    top of the action, so ordinary user error (a typo, an item that just
  //    sold out, an invalid promo code) doesn't cost one of the 5 hourly
  //    slots on retry. It must not move any later than this, though: every
  //    step from here on can write (createAddress unconditionally inserts a
  //    row with no dedup or per-user cap of its own) or is the order write
  //    itself, so a throttled call must never reach any of them — otherwise
  //    an attacker who has already exhausted their 5 slots gets unlimited
  //    free address-table writes and product/variant read load by looping
  //    with saveAddress: true, since no order is ever created to trip the
  //    pending-count fast path either.
  //    Best-effort by design: KV is eventually consistent, so very
  //    concurrent requests can slip past this check slightly over the cap —
  //    accepted here the same way the WhatsApp bot accepts it elsewhere in
  //    this codebase. It is not the hard boundary; the atomic guard in
  //    createOrderWithItems is.
  const withinRateLimit = await checkOrderRateLimit(await getKV(), userId);
  if (!withinRateLimit) {
    return {
      success: false,
      error: "Trop de commandes recentes. Merci de reessayer dans un moment.",
    };
  }

  // 10. Optionally save new address
  if (!data.savedAddressId && data.saveAddress) {
    await createAddress({
      userId,
      label: data.addressLabel || "Domicile",
      fullName: addressFullName,
      phone: addressPhone,
      street: addressStreet,
      commune: addressCommune,
      city: "Abidjan",
      zoneId: zone.id,
      instructions: data.instructions ?? null,
    });
  }

  // 11. Estimated delivery
  const estimatedDate = new Date();
  estimatedDate.setHours(estimatedDate.getHours() + zone.estimated_hours);
  const estimatedDelivery = estimatedDate.toISOString();

  // 12. Create order atomically
  const orderNumber = generateOrderNumber();
  const deliveryAddressFormatted = `${addressFullName}, ${addressStreet}, ${addressCommune}, ${addressCity}`;

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

  // Fire-and-forget: send order confirmation email
  notifyOrderConfirmation(session.user.email, {
    customerName: session.user.name || addressFullName,
    orderNumber,
    items: validatedItems.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
    })),
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    deliveryAddress: deliveryAddressFormatted,
    deliveryCommune: addressCommune,
    estimatedDelivery: estimatedDelivery,
  }).catch((err) => console.error("[checkout] notification error:", err));

  return { success: true, orderNumber };
}
