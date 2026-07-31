"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/store/store";
import { getDiscountedPrice } from "@/lib/products";
import {
  createChargedId,
  trackCartViewed,
  trackCheckoutStarted,
  trackCharged,
} from "@/lib/clevertap-events";

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const cartViewedSent = useRef(false);

  const subtotal = cart.reduce((sum, item) => sum + getDiscountedPrice(item) * item.quantity, 0);

  useEffect(() => {
    if (cartViewedSent.current || cart.length === 0) return;
    cartViewedSent.current = true;
    void trackCartViewed(cart, subtotal);
  }, [cart, subtotal]);

  async function handleCheckout() {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);

    const chargedId = createChargedId();
    const items = cart;
    const amount = subtotal;

    try {
      await trackCheckoutStarted(items, amount);
      await trackCharged(items, amount, chargedId);
      setLastOrderId(chargedId);
      clearCart();
    } finally {
      setCheckingOut(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="space-y-4">
        {lastOrderId && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-300">Order placed</p>
            <p className="mt-1 text-sm text-emerald-200/80">
              Charged ID <span className="font-mono">{lastOrderId}</span> was sent to CleverTap.
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827]/70 p-10 text-center text-slate-400">
          Your cart is empty. Add a few favorites to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cart.map((item) => (
        <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111827] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-sm text-slate-300">
              {item.category}
            </div>
            <div>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="text-sm text-slate-400">${getDiscountedPrice(item).toFixed(2)} each</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-white/10 bg-[#0b1220] p-1">
              <button className="rounded-full p-2 text-slate-300" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                <Minus size={14} />
              </button>
              <span className="min-w-8 text-center text-sm text-white">{item.quantity}</span>
              <button className="rounded-full p-2 text-slate-300" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                <Plus size={14} />
              </button>
            </div>
            <button className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300" onClick={() => removeFromCart(item.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex items-center justify-between text-slate-300">
          <span>Subtotal</span>
          <span className="text-lg font-semibold text-white">${subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkingOut}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
          >
            <CreditCard size={16} />
            {checkingOut ? "Placing order..." : `Checkout · $${subtotal.toFixed(2)}`}
          </button>
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
