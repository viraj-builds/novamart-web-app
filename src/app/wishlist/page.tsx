"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/lib/products";
import { useStore } from "@/store/store";
import { trackRemovedFromWishlist } from "@/lib/clevertap-events";

export default function WishlistPage() {
  const wishlist = useStore((state) => state.wishlist);
  const removeFromWishlist = useStore((state) => state.removeFromWishlist);
  const addToCart = useStore((state) => state.addToCart);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts() {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products ?? []);
    }

    loadProducts();
  }, []);

  const items = useMemo(() => products.filter((product) => wishlist.includes(product.id)), [products, wishlist]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827]/70 p-10 text-center text-slate-400">
        Your wishlist is empty. Save a few products and come back here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-white/10 bg-[#111827] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="text-sm text-slate-400">{item.brand}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                onClick={() => {
                  removeFromWishlist(item.id);
                  void trackRemovedFromWishlist(item);
                }}
              >
                Remove
              </button>
              {/* addToCart raises the CleverTap event itself. */}
              <button
                className="flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => addToCart(item)}
              >
                <ShoppingCart size={16} /> Add
              </button>
            </div>
          </div>
          <div className="mt-3">
            <Link href={`/product/${item.id}`} className="text-sm text-orange-400">
              View details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
