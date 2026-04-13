# WhatsApp Storefront & Notifications — Implementation Plan (Phase 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WhatsApp contextual buttons to the storefront (product card, product page, cart) and proactive WhatsApp notifications when order status changes.

**Architecture:** Storefront buttons use simple `wa.me` links with pre-filled messages. Proactive notifications use the WhatsApp Cloud API directly from server actions (same pattern as email notifications — fire-and-forget).

**Tech Stack:** Next.js components, WhatsApp `wa.me` deep links, Meta Graph API for template messages

---

## File Structure

### New files

```
components/storefront/whatsapp-product-button.tsx    # WhatsApp button for product page/card
components/storefront/whatsapp-cart-button.tsx        # "Finaliser via WhatsApp" for cart
lib/notifications/whatsapp.ts                        # WhatsApp notification sender
```

### Modified files

```
components/storefront/product-card-actions.tsx        # Add WhatsApp icon button
app/(storefront)/p/[slug]/page.tsx                   # Add WhatsApp button on product page
app/(storefront)/cart/page.tsx                       # Add WhatsApp cart button
actions/admin/orders.ts                              # Hook WhatsApp notification on status change
```

---

## Task 1: Create WhatsApp product button component

**Files:**
- Create: `components/storefront/whatsapp-product-button.tsx`

A simple client component that renders a `wa.me` link button. It receives product info and generates a pre-filled message.

```typescript
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface Props {
  productName: string;
  price: number;
  slug: string;
  phoneNumber: string;
  variant?: "icon" | "full";
}

export function WhatsAppProductButton({ productName, price, slug, phoneNumber, variant = "icon" }: Props) {
  const formattedPrice = new Intl.NumberFormat("fr-FR").format(price);
  const message = `Bonjour, je suis intéressé par *${productName}* (${formattedPrice} FCFA). Ref: ${slug}`;
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  if (variant === "icon") {
    return (
      <Button size="icon-sm" variant="outline" asChild aria-label={`Demander sur WhatsApp: ${productName}`}>
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          <HugeiconsIcon icon={WhatsappIcon} size={16} />
        </a>
      </Button>
    );
  }

  return (
    <Button variant="outline" className="w-full gap-2" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <HugeiconsIcon icon={WhatsappIcon} size={18} />
        Demander sur WhatsApp
      </a>
    </Button>
  );
}
```

Note: The `phoneNumber` will be loaded from an environment variable or KV cache. For now, use a constant or prop.

Commit:
```bash
git add components/storefront/whatsapp-product-button.tsx
git commit -m "feat(storefront): add WhatsApp product button component"
```

---

## Task 2: Add WhatsApp button to product card

**Files:**
- Modify: `components/storefront/product-card-actions.tsx`

Add a WhatsApp icon button next to the wishlist button. Import `WhatsAppProductButton` and render it alongside the wishlist:

```tsx
// After the WishlistButtonDynamic div (line ~82):
<div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
  <WhatsAppProductButton
    productName={product.name}
    price={product.base_price}
    slug={product.slug}
    phoneNumber={WHATSAPP_NUMBER}
    variant="icon"
  />
</div>
```

Use a constant `WHATSAPP_NUMBER` at the top of the file (e.g., `const WHATSAPP_NUMBER = "2250700000000";`). This will be replaced with a dynamic value later.

Commit:
```bash
git add components/storefront/product-card-actions.tsx
git commit -m "feat(storefront): add WhatsApp icon to product card actions"
```

---

## Task 3: Add WhatsApp button to product page

**Files:**
- Modify: `app/(storefront)/p/[slug]/page.tsx`

Add a full-width "Demander sur WhatsApp" button below the AddToCartButton in the buy section. Import `WhatsAppProductButton` and render with `variant="full"`.

Commit:
```bash
git add "app/(storefront)/p/[slug]/page.tsx"
git commit -m "feat(storefront): add WhatsApp button on product page"
```

---

## Task 4: Create WhatsApp cart button and add to cart page

**Files:**
- Create: `components/storefront/whatsapp-cart-button.tsx`
- Modify: `app/(storefront)/cart/page.tsx`

### Cart button component

A client component that reads the cart from Zustand and generates a `wa.me` link with the cart summary:

```typescript
"use client";

import { useCartStore, selectCartSubtotal } from "@/stores/cart-store";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "2250700000000";

export function WhatsAppCartButton() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);

  if (items.length === 0) return null;

  const formattedTotal = new Intl.NumberFormat("fr-FR").format(subtotal);
  const itemLines = items.map((i) => `- ${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity} (${new Intl.NumberFormat("fr-FR").format(i.price * i.quantity)} FCFA)`).join("\n");
  const message = `Bonjour, je souhaite commander :\n${itemLines}\nTotal : ${formattedTotal} FCFA`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <Button variant="outline" className="w-full gap-2" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <HugeiconsIcon icon={WhatsappIcon} size={18} />
        Finaliser via WhatsApp
      </a>
    </Button>
  );
}
```

### Cart page modification

Add the WhatsApp button in the summary section, before the checkout link.

Commit:
```bash
git add components/storefront/whatsapp-cart-button.tsx "app/(storefront)/cart/page.tsx"
git commit -m "feat(storefront): add WhatsApp checkout button on cart page"
```

---

## Task 5: Implement WhatsApp notification sender

**Files:**
- Create: `lib/notifications/whatsapp.ts`

A fire-and-forget notification function that sends WhatsApp messages via the Meta Cloud API when order status changes.

```typescript
import { getDB } from "@/lib/cloudflare/context";

interface OrderNotificationData {
  orderNumber: string;
  customerPhone: string;
  status: string;
  total?: number;
  estimatedDelivery?: string;
}

const STATUS_MESSAGES: Record<string, (data: OrderNotificationData) => string> = {
  confirmed: (d) => `Votre commande *${d.orderNumber}* est confirmée. Montant : *${new Intl.NumberFormat("fr-FR").format(d.total ?? 0)} FCFA*. Livraison estimée sous 24-48h.`,
  preparing: (d) => `Votre commande *${d.orderNumber}* est en cours de préparation.`,
  shipping: (d) => `Votre commande *${d.orderNumber}* est en route ! Notre livreur vous contactera bientôt.`,
  delivered: (d) => `Votre commande *${d.orderNumber}* a été livrée. Merci pour votre confiance !`,
};

export async function notifyOrderStatusWhatsApp(
  data: OrderNotificationData
): Promise<void> {
  const messageFn = STATUS_MESSAGES[data.status];
  if (!messageFn) return;

  try {
    const db = getDB();
    const config = await db
      .prepare("SELECT phone_number_id, access_token, is_active FROM whatsapp_config WHERE id = 1")
      .first<{ phone_number_id: string; access_token: string; is_active: number }>();

    if (!config || !config.is_active) return;

    // Check if customer has a verified WhatsApp session
    const session = await db
      .prepare("SELECT id FROM whatsapp_sessions WHERE wa_phone = ? AND is_verified = 1")
      .bind(data.customerPhone.replace(/^\+/, ""))
      .first<{ id: string }>();

    if (!session) return;

    const message = messageFn(data);

    await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: data.customerPhone.replace(/^\+/, ""),
        type: "text",
        text: { body: message },
      }),
    });
  } catch (error) {
    console.error(`[whatsapp-notifications] Failed to send status update for ${data.orderNumber}:`, error);
  }
}
```

Commit:
```bash
git add lib/notifications/whatsapp.ts
git commit -m "feat(notifications): add WhatsApp notification sender for order status"
```

---

## Task 6: Hook WhatsApp notifications into order status updates

**Files:**
- Modify: `actions/admin/orders.ts`

After line ~160 (where email notification is sent), add WhatsApp notification:

```typescript
import { notifyOrderStatusWhatsApp } from "@/lib/notifications/whatsapp";

// After the email notification block (line ~161):
if (customer?.phone) {
  notifyOrderStatusWhatsApp({
    orderNumber: order.order_number,
    customerPhone: customer.phone,
    status: newStatus,
    total: order.total,
  });
}
```

This is fire-and-forget (no await), same pattern as email notifications.

Commit:
```bash
git add actions/admin/orders.ts
git commit -m "feat(notifications): hook WhatsApp notifications on order status change"
```

---

## Phase 4 Complete

The WhatsApp integration is now fully operational:
- **Storefront**: WhatsApp buttons on product cards, product pages, and cart
- **Notifications**: Automatic WhatsApp messages on order status changes
- **Bot**: Full conversational ordering via WhatsApp (Phases 1-2)
- **Admin**: Configuration, conversations viewer, analytics (Phase 3)
