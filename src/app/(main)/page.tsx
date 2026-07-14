"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { formatCategoryLabel } from "@/lib/products";
import { useProducts } from "@/lib/use-products";

const PAGE_SIZE = 6;

export default function HomePage() {
  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    visibleCount,
    setVisibleCount,
    filteredProducts,
    categories,
    loading,
  } = useProducts(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filteredProducts.length) {
          setVisibleCount((value) => Math.min(value + PAGE_SIZE, filteredProducts.length));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredProducts.length, setVisibleCount, visibleCount]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#0f172a] p-4 sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search gear, brands, sports"
            className="w-full rounded-full border border-white/10 bg-[#111827] py-3 pl-11 pr-4 text-sm text-white outline-none ring-0"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category, index) => {
            const normalizedCategory = String(category ?? "general");
            const active = selectedCategory === normalizedCategory;
            return (
              <button
                key={`${normalizedCategory}-${index}`}
                onClick={() => setSelectedCategory(active ? "all" : normalizedCategory)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {formatCategoryLabel(normalizedCategory)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">Search Results</p>
          <h2 className="text-2xl font-semibold text-white">Top picks for you</h2>
        </div>
        <Link href="/products" className="text-sm font-medium text-orange-400">
          See All
        </Link>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-[#111827] p-4">
              <div className="aspect-[4/5] rounded-xl bg-slate-800" />
              <div className="mt-4 h-4 w-2/3 rounded bg-slate-800" />
              <div className="mt-2 h-4 w-1/2 rounded bg-slate-800" />
              <div className="mt-4 h-10 rounded-full bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827]/70 p-10 text-center text-slate-400">
          No products matched your search. Try a different keyword.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} imageUrl={product.imageUrl} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
          {visibleCount < filteredProducts.length && (
            <div className="flex justify-center">
              <button
                onClick={() => setVisibleCount((value) => Math.min(value + PAGE_SIZE, filteredProducts.length))}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
