"use client";

import { trackCleverTapEvent } from "@/lib/clevertap";
import { getDiscountedPrice, type Product } from "@/lib/products";

export type CartItem = Product & { quantity: number };

/**
 * These names are reserved by CleverTap and are rejected by the SDK with error 513
 * if an app tries to raise them: "Stayed", "UTM Visited", "App Launched",
 * "Notification Sent", "Notification Viewed", "Notification Clicked".
 *
 * Everything below is a custom event, which means a campaign can only qualify on it
 * once the app has actually raised it at least once.
 */

function productProperties(product: Product) {
  return {
    "Product ID": product.id,
    "Product Name": product.name,
    Brand: product.brand,
    Category: product.category,
    Price: product.price,
    "Discounted Price": Number(getDiscountedPrice(product).toFixed(2)),
    "Discount Percent": product.discountPercent,
    Rating: product.rating,
  };
}

export function trackProductViewed(product: Product) {
  return trackCleverTapEvent("Product Viewed", productProperties(product));
}

export function trackAddToCart(product: Product) {
  return trackCleverTapEvent("Add to Cart", productProperties(product));
}

export function trackRemoveFromCart(item: CartItem) {
  return trackCleverTapEvent("Removed From Cart", {
    ...productProperties(item),
    Quantity: item.quantity,
  });
}

export function trackAddedToWishlist(product: Product) {
  return trackCleverTapEvent("Added to Wishlist", productProperties(product));
}

export function trackRemovedFromWishlist(product: Product) {
  return trackCleverTapEvent("Removed from Wishlist", productProperties(product));
}

export function trackProductSearched(query: string, resultCount: number) {
  return trackCleverTapEvent("Product Searched", {
    "Search Query": query,
    "Result Count": resultCount,
  });
}

export function trackCartViewed(cart: CartItem[], subtotal: number) {
  return trackCleverTapEvent("Cart Viewed", {
    "Item Count": cart.reduce((sum, item) => sum + item.quantity, 0),
    "Line Item Count": cart.length,
    Amount: Number(subtotal.toFixed(2)),
    Currency: "USD",
  });
}

export function trackCheckoutStarted(cart: CartItem[], subtotal: number) {
  return trackCleverTapEvent("Checkout Started", {
    "Item Count": cart.reduce((sum, item) => sum + item.quantity, 0),
    "Line Item Count": cart.length,
    Amount: Number(subtotal.toFixed(2)),
    Currency: "USD",
  });
}

/**
 * "Charged" is CleverTap's reserved revenue event and the SDK validates its shape
 * (error 511 if it fails):
 *  - `Items` must be an array of *flat* objects — no nested objects or arrays.
 *  - Every other top-level property must be a scalar.
 *  - More than 50 items is reported as error 522.
 *  - `Charged ID` is used for de-duplication, so it must be unique per order.
 */
export function trackCharged(cart: CartItem[], subtotal: number, chargedId: string) {
  return trackCleverTapEvent("Charged", {
    Amount: Number(subtotal.toFixed(2)),
    "Charged ID": chargedId,
    Currency: "USD",
    "Payment Mode": "Card",
    "Item Count": cart.reduce((sum, item) => sum + item.quantity, 0),
    Items: cart.slice(0, 50).map((item) => ({
      "Product ID": item.id,
      "Product Name": item.name,
      Category: item.category,
      Brand: item.brand,
      Price: Number(getDiscountedPrice(item).toFixed(2)),
      Quantity: item.quantity,
    })),
  });
}

export function createChargedId() {
  return `NM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
