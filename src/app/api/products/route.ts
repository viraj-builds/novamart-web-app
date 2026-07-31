import { NextResponse } from "next/server";

type FakeStoreProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: { rate: number; count: number };
};

type DummyJsonProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  thumbnail?: string;
  images?: string[];
  brand: string;
  rating: number;
  stock: number;
  discountPercentage: number;
};

type DummyCategory = {
  slug?: string;
  name?: string;
};

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  discountPercent: number;
  imageUrl: string;
  rating: number;
  description: string;
  stock: number;
};

const productCache = new Map<string, { data: { products: Product[]; categories: string[] }; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeProduct(product: FakeStoreProduct | DummyJsonProduct, source: "fakestore" | "dummyjson"): Product {
  if (source === "fakestore") {
    const item = product as FakeStoreProduct;
    return {
      id: item.id,
      name: item.title,
      brand: "Generic",
      category: item.category,
      price: item.price,
      discountPercent: 0,
      imageUrl: item.image,
      rating: item.rating?.rate ?? 0,
      description: item.description,
      stock: 20,
    };
  }

  const item = product as DummyJsonProduct;
  return {
    id: item.id + 1000,
    name: item.title,
    brand: item.brand || "Generic",
    category: item.category,
    price: item.price,
    discountPercent: item.discountPercentage ?? 0,
    imageUrl: item.images?.[0] || item.thumbnail || "",
    rating: typeof item.rating === "number" ? item.rating : Number(item.rating) || 0,
    description: item.description,
    stock: item.stock ?? 10,
  };
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const [fakeStoreRes, dummyJsonRes] = await Promise.all([
      fetch("https://fakestoreapi.com/products", { next: { revalidate: 3600 } }),
      fetch("https://dummyjson.com/products?limit=100", { next: { revalidate: 3600 } }),
    ]);

    const fakeStoreData = await fakeStoreRes.json();
    const dummyJsonData = await dummyJsonRes.json();

    const normalized = [
      ...fakeStoreData.map((item: FakeStoreProduct) => normalizeProduct(item, "fakestore")),
      ...dummyJsonData.products.map((item: DummyJsonProduct) => normalizeProduct(item, "dummyjson")),
    ];

    const uniqueById = new Map<number, Product>();
    normalized.forEach((item) => {
      if (!uniqueById.has(item.id)) {
        uniqueById.set(item.id, item);
      }
    });

    const products = Array.from(uniqueById.values());
    for (let i = products.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [products[i], products[j]] = [products[j], products[i]];
    }

    return products;
  } catch (error) {
    console.error("Failed to fetch external product sources:", error);
    return [];
  }
}

function normalizeCategory(value: string | DummyCategory): string {
  const raw = typeof value === "string" ? value : value?.name ?? value?.slug ?? "general";

  return raw
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "general";
}

export async function GET() {
  const now = Date.now();
  const cachedPayload = productCache.get("products");
  if (cachedPayload && now - cachedPayload.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload.data);
  }

  const products = await fetchProducts();
  const visibleProducts = products.filter((product) => Boolean(product.imageUrl));
  const normalizedCategories = Array.from(
    new Set(visibleProducts.map((product) => normalizeCategory(product.category)))
  ).sort();

  const payload = { products: visibleProducts, categories: normalizedCategories };
  productCache.set("products", { data: payload, timestamp: now });

  return NextResponse.json(payload);
}
