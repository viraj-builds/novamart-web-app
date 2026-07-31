"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Star } from "lucide-react";
import { formatCategoryLabel, getDiscountedPrice, type Product } from "@/lib/products";
import { trackCleverTapEvent } from "@/lib/clevertap";
import { useStore } from "@/store/store";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const addToCart = useStore((state) => state.addToCart);
  const [product, setProduct] = useState<Product | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      const response = await fetch("/api/products", { cache: "force-cache" });
      const data = await response.json();
      const match = data.products?.find((item: Product) => item.id === id) ?? null;
      setProduct(match);
    }

    loadProduct();
  }, [id]);

  const discountedPrice = useMemo(() => (product ? getDiscountedPrice(product) : 0), [product]);

  if (!product) {
    return null;
  }

  const handleAddToCart = async () => {
    addToCart(product);
    await trackCleverTapEvent("Add to Cart", {
      "Product Name": product.name,
      Price: product.price,
      Category: product.category,
      Brand: product.brand,
      "Discount Percent": product.discountPercent,
    });
  };

  return (
    <div className="grid gap-8 rounded-[28px] border border-white/10 bg-[#111827] p-4 md:grid-cols-[1.1fr_0.9fr] md:p-8">
      <div className="relative h-72 overflow-hidden rounded-2xl sm:h-[28rem] bg-slate-950">
        {!imageError && product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm text-slate-300">
            Image unavailable
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">{formatCategoryLabel(product.category)}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{product.name}</h1>
          <p className="mt-2 text-slate-400">{product.description}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={14} className={index < Math.round(product.rating) ? "fill-orange-500 text-orange-500" : "text-slate-600"} />
              ))}
            </div>
            <span>{product.rating.toFixed(1)} rating</span>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1220] p-4">
            <p className="text-sm text-slate-400">Price</p>
            <div className="mt-2 flex items-center gap-3">
              {product.discountPercent > 0 ? (
                <>
                  <p className="text-2xl font-semibold text-white">${discountedPrice.toFixed(2)}</p>
                  <p className="text-sm text-slate-400 line-through">${product.price.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-2xl font-semibold text-white">${product.price.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-6 flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3 font-semibold text-white"
        >
          <ShoppingCart size={18} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
