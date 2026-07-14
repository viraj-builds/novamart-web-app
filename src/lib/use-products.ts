"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeCategory, type Product } from "@/lib/products";

export function useProducts(pageSize = 6) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoading(true);
      const response = await fetch("/api/products", { cache: "force-cache" });
      const data = await response.json();
      if (!active) return;

      const dataTyped = data as { products?: Product[]; categories?: unknown[] };
      const normalizedProducts = (dataTyped.products ?? []).map((product) => ({
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
      setLoading(false);
    }

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, selectedCategory, pageSize]);

  const filteredProducts = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || selectedCategory === "all" || normalizeCategory(product.category) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [debouncedSearch, products, selectedCategory]);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    visibleCount,
    setVisibleCount,
    filteredProducts,
    categories,
    loading,
  };
}
