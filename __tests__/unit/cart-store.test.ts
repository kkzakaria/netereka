import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock server actions before importing the store
vi.mock("@/actions/cart", () => ({
  saveCart: vi.fn().mockResolvedValue(undefined),
  clearServerCart: vi.fn().mockResolvedValue(undefined),
}));

import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/lib/types/cart";

function makeItem(overrides: Partial<CartItem> = {}): Omit<CartItem, "quantity"> {
  return {
    productId: "prod-1",
    variantId: null,
    name: "Smartphone Galaxy",
    variantName: null,
    price: 150000,
    imageUrl: null,
    slug: "smartphone-galaxy",
    ...overrides,
  };
}

describe("useCartStore", () => {
  beforeEach(() => {
    // Reset store to empty state
    useCartStore.setState({ items: [], drawerOpen: false });
    vi.clearAllMocks();
  });

  describe("add", () => {
    it("ajoute un article au panier", () => {
      useCartStore.getState().add(makeItem());
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe("prod-1");
      expect(items[0].quantity).toBe(1);
    });

    it("ajoute avec une quantité spécifiée", () => {
      useCartStore.getState().add(makeItem(), 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it("incrémente la quantité si l'article existe déjà", () => {
      useCartStore.getState().add(makeItem(), 2);
      useCartStore.getState().add(makeItem(), 3);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
    });

    it("plafonne la quantité à MAX_QUANTITY (10)", () => {
      useCartStore.getState().add(makeItem(), 7);
      useCartStore.getState().add(makeItem(), 7);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("plafonne la quantité initiale à MAX_QUANTITY", () => {
      useCartStore.getState().add(makeItem(), 15);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("traite les variantes différentes comme des articles distincts", () => {
      useCartStore.getState().add(makeItem({ variantId: "var-1", variantName: "Noir" }));
      useCartStore.getState().add(makeItem({ variantId: "var-2", variantName: "Blanc" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("traite les produits différents comme des articles distincts", () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("ouvre le drawer après ajout", () => {
      expect(useCartStore.getState().drawerOpen).toBe(false);
      useCartStore.getState().add(makeItem());
      expect(useCartStore.getState().drawerOpen).toBe(true);
    });

    it("refuse d'ajouter au-delà de MAX_CART_ITEMS (50)", () => {
      // Fill cart to 50 items
      for (let i = 0; i < 50; i++) {
        useCartStore.getState().add(makeItem({ productId: `prod-${i}` }));
      }
      expect(useCartStore.getState().items).toHaveLength(50);

      // Try adding one more
      useCartStore.getState().add(makeItem({ productId: "prod-overflow" }));
      expect(useCartStore.getState().items).toHaveLength(50);
    });
  });

  describe("remove", () => {
    it("supprime un article du panier", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().remove("prod-1", null);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("supprime la bonne variante", () => {
      useCartStore.getState().add(makeItem({ variantId: "var-1" }));
      useCartStore.getState().add(makeItem({ variantId: "var-2" }));
      useCartStore.getState().remove("prod-1", "var-1");
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].variantId).toBe("var-2");
    });

    it("ne fait rien si l'article n'existe pas", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().remove("prod-unknown", null);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("updateQuantity", () => {
    it("met à jour la quantité d'un article", () => {
      useCartStore.getState().add(makeItem(), 1);
      useCartStore.getState().updateQuantity("prod-1", null, 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("plafonne à MAX_QUANTITY (10)", () => {
      useCartStore.getState().add(makeItem(), 1);
      useCartStore.getState().updateQuantity("prod-1", null, 20);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("supprime l'article si la quantité est 0", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().updateQuantity("prod-1", null, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("supprime l'article si la quantité est négative", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().updateQuantity("prod-1", null, -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("vide le panier", () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2" }));
      useCartStore.getState().clear();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("setItems", () => {
    it("remplace les articles du panier", () => {
      useCartStore.getState().add(makeItem());
      const newItems: CartItem[] = [
        { ...makeItem({ productId: "prod-x" }), quantity: 2 },
      ];
      useCartStore.getState().setItems(newItems);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe("prod-x");
    });
  });

  describe("drawer", () => {
    it("ouvre le drawer", () => {
      useCartStore.getState().openDrawer();
      expect(useCartStore.getState().drawerOpen).toBe(true);
    });

    it("ferme le drawer", () => {
      useCartStore.getState().openDrawer();
      useCartStore.getState().closeDrawer();
      expect(useCartStore.getState().drawerOpen).toBe(false);
    });
  });
});
