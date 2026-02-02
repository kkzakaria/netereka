export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  imageUrl: string | null;
  slug: string;
  quantity: number;
}

export function cartItemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return `${item.productId}:${item.variantId ?? "default"}`;
}
