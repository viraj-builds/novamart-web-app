export type Product = {
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

export type ProductsResponse = {
  products: Product[];
  categories: string[];
};

export function normalizeCategory(value: unknown): string {
  if (typeof value === "string") {
    return value
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "general";
  }

  if (value && typeof value === "object") {
    const candidate = value as { name?: string; slug?: string };
    return normalizeCategory(candidate.name ?? candidate.slug ?? "general");
  }

  return "general";
}

export function formatCategoryLabel(category: string): string {
  return category
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Server-side callers need an absolute URL. On Vercel that origin is only known at
// runtime, so never hardcode localhost here.
function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function getProducts(): Promise<ProductsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/products`);

  if (!response.ok) {
    return { products: [], categories: [] };
  }

  return response.json();
}

export function getDiscountedPrice(product: Product) {
  return product.price - (product.price * product.discountPercent) / 100;
}
