"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, Info, ShoppingCart, Star } from "lucide-react";
import { useStore } from "@/store/store";
import type { Product } from "@/lib/products";
import { getDiscountedPrice } from "@/lib/products";
import { trackAddedToWishlist, trackRemovedFromWishlist } from "@/lib/clevertap-events";

type ProductCardProps = {
  product: Product;
  imageUrl?: string;
};

export function ProductCard({ product, imageUrl }: ProductCardProps) {
  const [mounted, setMounted] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const addToCart = useStore((state) => state.addToCart);

  useEffect(() => setMounted(true), []);

  const isWishlisted = wishlist.includes(product.id);
  const discountedPrice = useMemo(() => getDiscountedPrice(product), [product]);

  // addToCart raises the CleverTap event itself — do not raise it again here.
  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    void (isWishlisted ? trackRemovedFromWishlist(product) : trackAddedToWishlist(product));
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-lg shadow-black/20">
      <div className="relative h-64 overflow-hidden rounded-xl bg-slate-950">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain"
            loading="eager"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm text-slate-400">
            Image unavailable
          </div>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
            {product.discountPercent}% OFF
          </span>
        )}
        <button
          type="button"
          className="absolute left-1/2 top-3 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-900/70"
          onClick={() => setShowSpecs((value) => !value)}
          aria-label="Quick specs"
        >
          <Info size={16} className="text-slate-200" />
        </button>
        {showSpecs && (
          <div className="absolute left-1/2 top-12 z-10 w-40 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900/95 p-3 text-sm text-slate-200 shadow-xl">
            <p className="font-semibold text-white">Quick specs</p>
            <ul className="mt-2 space-y-1">
              <li>• {product.category}</li>
              <li>• Stock: {product.stock}</li>
              <li>• Rating: {product.rating.toFixed(1)}</li>
            </ul>
          </div>
        )}
        <button
          type="button"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/70"
          onClick={handleToggleWishlist}
          aria-label="Toggle wishlist"
        >
          <Heart
            size={16}
            className={isWishlisted ? "fill-red-500 text-red-500" : "text-slate-200"}
          />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{product.brand}</p>
          <Link href={`/product/${product.id}`} className="mt-1 block text-base font-semibold text-white">
            {product.name}
          </Link>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-300">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={14} className={index < Math.round(product.rating) ? "fill-orange-500 text-orange-500" : "text-slate-600"} />
            ))}
            <span className="ml-1">{product.rating.toFixed(1)}</span>
          </div>
          <div className="text-right">
            {product.discountPercent > 0 ? (
              <>
                <p className="text-sm text-slate-400 line-through">${product.price.toFixed(2)}</p>
                <p className="font-semibold text-white">${discountedPrice.toFixed(2)}</p>
              </>
            ) : (
              <p className="font-semibold text-white">${product.price.toFixed(2)}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          onClick={handleAddToCart}
        >
          <ShoppingCart size={16} />
          {mounted ? (added ? "Added!" : "Add to Cart") : "Loading..."}
        </button>
      </div>
    </article>
  );
}
