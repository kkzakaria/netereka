import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveCart: vi.fn().mockResolvedValue(undefined),
  clearServerCart: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/actions/cart", () => ({
  saveCart: mocks.saveCart,
  clearServerCart: mocks.clearServerCart,
}));

import { useCartStore, selectCartItemCount, selectCartSubtotal } from "@/stores/cart-store";
import { cartItemKey } from "@/lib/types/cart";
import type { CartItem } from "@/lib/types/cart";

function makeItem(overrides: Partial<CartItem> = {}): Omit<CartItem, "quantity"> {
  return {
    productId: "prod-1",
    variantId: null,
    name: "iPhone 15",
    variantName: null,
    price: 750000,
    imageUrl: null,
    slug: "iphone-15",
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return { ...makeItem(overrides), quantity: 1, ...overrides };
}

describe("Cart Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCartStore.setState({ items: [], drawerOpen: false });
    vi.clearAllMocks();
  });

  // ─── ajout ───

  describe("ajout", () => {
    it("ajoute un nouvel article au panier", () => {
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

    it("fusionne les quantités pour un article existant", () => {
      useCartStore.getState().add(makeItem(), 2);
      useCartStore.getState().add(makeItem(), 3);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
    });

    it("cap la quantité à MAX_QUANTITY (10)", () => {
      useCartStore.getState().add(makeItem(), 7);
      useCartStore.getState().add(makeItem(), 5);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("cap la quantité initiale à MAX_QUANTITY (10)", () => {
      useCartStore.getState().add(makeItem(), 15);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("distingue les variantes comme des articles différents", () => {
      useCartStore.getState().add(makeItem({ variantId: "var-1", variantName: "128Go" }));
      useCartStore.getState().add(makeItem({ variantId: "var-2", variantName: "256Go" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("distingue les produits différents", () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2", name: "Samsung S24" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("refuse d'ajouter au-delà de MAX_CART_ITEMS (50)", () => {
      // Remplir le panier avec 50 articles différents
      const items: CartItem[] = Array.from({ length: 50 }, (_, i) =>
        makeCartItem({ productId: `prod-${i}`, quantity: 1 })
      );
      useCartStore.setState({ items });

      // Le 51ème ne doit pas être ajouté
      useCartStore.getState().add(makeItem({ productId: "prod-extra" }));
      expect(useCartStore.getState().items).toHaveLength(50);
    });

    it("permet de fusionner même si le panier est plein", () => {
      const items: CartItem[] = Array.from({ length: 50 }, (_, i) =>
        makeCartItem({ productId: `prod-${i}`, quantity: 1 })
      );
      useCartStore.setState({ items });

      // Ajouter à un article existant doit fonctionner
      useCartStore.getState().add(makeItem({ productId: "prod-0" }), 2);
      const updated = useCartStore.getState().items.find((i) => i.productId === "prod-0");
      expect(updated?.quantity).toBe(3);
      expect(useCartStore.getState().items).toHaveLength(50);
    });

    it("ouvre le drawer après ajout", () => {
      expect(useCartStore.getState().drawerOpen).toBe(false);
      useCartStore.getState().add(makeItem());
      expect(useCartStore.getState().drawerOpen).toBe(true);
    });
  });

  // ─── suppression ───

  describe("suppression", () => {
    it("supprime un article par productId et variantId", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().remove("prod-1", null);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("ne supprime que l'article correspondant", () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2", name: "Galaxy" }));
      useCartStore.getState().remove("prod-1", null);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe("prod-2");
    });

    it("supprime la bonne variante", () => {
      useCartStore.getState().add(makeItem({ variantId: "var-1" }));
      useCartStore.getState().add(makeItem({ variantId: "var-2" }));
      useCartStore.getState().remove("prod-1", "var-1");
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].variantId).toBe("var-2");
    });

    it("ne fait rien si l'article n'existe pas", () => {
      useCartStore.getState().add(makeItem());
      useCartStore.getState().remove("prod-inexistant", null);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  // ─── mise à jour quantité ───

  describe("mise à jour quantité", () => {
    it("met à jour la quantité d'un article", () => {
      useCartStore.getState().add(makeItem(), 1);
      useCartStore.getState().updateQuantity("prod-1", null, 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("cap la quantité à MAX_QUANTITY (10)", () => {
      useCartStore.getState().add(makeItem(), 1);
      useCartStore.getState().updateQuantity("prod-1", null, 15);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it("supprime l'article si la quantité est 0", () => {
      useCartStore.getState().add(makeItem(), 3);
      useCartStore.getState().updateQuantity("prod-1", null, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("supprime l'article si la quantité est négative", () => {
      useCartStore.getState().add(makeItem(), 3);
      useCartStore.getState().updateQuantity("prod-1", null, -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ─── vidage ───

  describe("vidage", () => {
    it("vide le panier", () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2" }));
      useCartStore.getState().clear();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ─── remplacement d'articles ───

  describe("remplacement d'articles", () => {
    it("remplace tous les articles", () => {
      useCartStore.getState().add(makeItem());
      const newItems = [makeCartItem({ productId: "prod-x", quantity: 4 })];
      useCartStore.getState().setItems(newItems);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe("prod-x");
    });
  });

  // ─── drawer ───

  describe("drawer", () => {
    it("ouvre et ferme le drawer", () => {
      useCartStore.getState().openDrawer();
      expect(useCartStore.getState().drawerOpen).toBe(true);
      useCartStore.getState().closeDrawer();
      expect(useCartStore.getState().drawerOpen).toBe(false);
    });
  });

  // ─── sélecteurs dérivés ───

  describe("sélecteurs dérivés", () => {
    it("selectCartItemCount retourne le nombre total d'articles", () => {
      useCartStore.setState({
        items: [
          makeCartItem({ productId: "prod-1", quantity: 3 }),
          makeCartItem({ productId: "prod-2", quantity: 2 }),
        ],
      });
      expect(selectCartItemCount(useCartStore.getState())).toBe(5);
    });

    it("selectCartSubtotal retourne le sous-total", () => {
      useCartStore.setState({
        items: [
          makeCartItem({ productId: "prod-1", price: 25000, quantity: 2 }),
          makeCartItem({ productId: "prod-2", price: 15000, quantity: 1 }),
        ],
      });
      expect(selectCartSubtotal(useCartStore.getState())).toBe(65000);
    });

    it("retourne 0 pour un panier vide", () => {
      const state = useCartStore.getState();
      expect(selectCartItemCount(state)).toBe(0);
      expect(selectCartSubtotal(state)).toBe(0);
    });
  });

  // ─── persistance serveur ───

  describe("persistance serveur", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("appelle saveCart après ajout (debounced)", async () => {
      useCartStore.getState().add(makeItem());
      // Le debounce est de 500ms
      vi.advanceTimersByTime(500);
      expect(mocks.saveCart).toHaveBeenCalledTimes(1);
      expect(mocks.saveCart).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ productId: "prod-1" })])
      );
    });

    it("appelle saveCart après suppression (debounced)", async () => {
      useCartStore.setState({ items: [makeCartItem()] });
      vi.clearAllMocks();
      useCartStore.getState().remove("prod-1", null);
      vi.advanceTimersByTime(500);
      expect(mocks.saveCart).toHaveBeenCalledTimes(1);
      expect(mocks.saveCart).toHaveBeenCalledWith([]);
    });

    it("appelle saveCart après mise à jour de quantité (debounced)", async () => {
      useCartStore.setState({ items: [makeCartItem()] });
      vi.clearAllMocks();
      useCartStore.getState().updateQuantity("prod-1", null, 5);
      vi.advanceTimersByTime(500);
      expect(mocks.saveCart).toHaveBeenCalledTimes(1);
      expect(mocks.saveCart).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ quantity: 5 })])
      );
    });

    it("regroupe les appels rapides en un seul (debounce)", async () => {
      useCartStore.getState().add(makeItem({ productId: "prod-1" }));
      useCartStore.getState().add(makeItem({ productId: "prod-2" }));
      useCartStore.getState().add(makeItem({ productId: "prod-3" }));
      vi.advanceTimersByTime(500);
      // Un seul appel malgré 3 ajouts rapides
      expect(mocks.saveCart).toHaveBeenCalledTimes(1);
    });

    it("appelle clearServerCart lors du vidage", () => {
      useCartStore.getState().add(makeItem());
      vi.clearAllMocks();
      useCartStore.getState().clear();
      expect(mocks.clearServerCart).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── cartItemKey (rappel, testé aussi séparément) ───

describe("cartItemKey dans le contexte du store", () => {
  it("produit la même clé que le store utilise pour fusionner", () => {
    const key1 = cartItemKey({ productId: "p1", variantId: "v1" });
    const key2 = cartItemKey({ productId: "p1", variantId: "v1" });
    expect(key1).toBe(key2);
  });

  it("différencie null et une variante", () => {
    const key1 = cartItemKey({ productId: "p1", variantId: null });
    const key2 = cartItemKey({ productId: "p1", variantId: "v1" });
    expect(key1).not.toBe(key2);
  });
});
