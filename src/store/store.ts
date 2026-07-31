"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { trackCleverTapEvent } from "@/lib/clevertap";
import type { Product } from "@/lib/products";

type CartItem = Product & { quantity: number };

type StoreState = {
  cart: CartItem[];
  wishlist: number[];
  addToCart: (product: Product) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
  toggleWishlist: (id: number) => void;
  removeFromWishlist: (id: number) => void;
  clearCart: () => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      cart: [],
      wishlist: [],
      addToCart: async (product) => {
        void trackCleverTapEvent("Add to Cart", {
          "Product ID": product.id,
          "Product Name": product.name,
          Price: product.price,
          Category: product.category,
        });

        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return { cart: [...state.cart, { ...product, quantity: 1 }] };
        });
      },
      updateQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart
            .map((item) => (item.id === id ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0),
        })),
      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
      toggleWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.includes(id)
            ? state.wishlist.filter((itemId) => itemId !== id)
            : [...state.wishlist, id],
        })),
      removeFromWishlist: (id) =>
        set((state) => ({ wishlist: state.wishlist.filter((itemId) => itemId !== id) })),
      clearCart: () => set({ cart: [] }),
    }),
    { name: "novamart-store" }
  )
);
