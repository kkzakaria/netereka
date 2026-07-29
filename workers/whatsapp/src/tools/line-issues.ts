/**
 * Reasons a cart line cannot be ordered that `resolveOrderLine` does not
 * cover — it decides pricing and stock, not whether the catalogue still
 * carries the item.
 *
 * Both the cart view and the order path must say the same thing about the
 * same line, so the wording lives here rather than inline in each file.
 * These are deliberately NOT stock messages: the customer's remedy is to
 * remove or change the line, not to reduce its quantity.
 */

export function productGoneFromCatalogue(productName: string): string {
  return `« ${productName} » ne figure plus dans notre catalogue. Veuillez le retirer de votre panier.`;
}

export function variantGoneFromCatalogue(productName: string): string {
  return `La variante choisie pour ${productName} n'est plus proposée. Veuillez en sélectionner une autre.`;
}

/**
 * A product is orderable only while it is active and out of draft — the same
 * predicate `add_to_cart` applies at entry and the web checkout applies at
 * payment. D1 returns SQLite booleans as 0/1.
 */
export function isProductInCatalogue(row: {
  product_is_active: number;
  product_is_draft: number;
}): boolean {
  return row.product_is_active === 1 && row.product_is_draft === 0;
}
