"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { formatCategoryLabel, normalizeCategory, type Product } from "@/lib/products";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadProducts() {
      const response = await fetch("/api/products", { cache: "force-cache" });
      const data = (await response.json()) as { products?: Product[]; categories?: unknown[] };
      const normalizedProducts = (data.products ?? []).map((product) => ({
        ...product,
        category: normalizeCategory(product.category),
      }));
      const productCategories = Array.from(
        new Set(
          normalizedProducts
            .filter((product) => Boolean(product.imageUrl))
            .map((product) => product.category)
        )
      )
        .sort()
        .filter(Boolean);
      setProducts(normalizedProducts);
      setCategories(["all", ...productCategories]);
    }
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || selectedCategory === "all" || normalizeCategory(product.category) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  useEffect(() => {
    setVisibleCount(6);
  }, [search, selectedCategory]);

  useEffect(() => {
    if (!sentinelRef.current || visibleCount >= filteredProducts.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 6, filteredProducts.length));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredProducts.length, visibleCount]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search all gear"
          className="w-full rounded-full border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(active ? "all" : category)}
                className={`rounded-full px-4 py-2 text-sm ${active ? "bg-blue-600 text-white" : "bg-white/5 text-slate-300"}`}
              >
                {formatCategoryLabel(category)}
              </button>
            );
          })}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827]/70 p-10 text-center text-slate-400">
          No products found.
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
                onClick={() => setVisibleCount((count) => Math.min(count + 6, filteredProducts.length))}
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
