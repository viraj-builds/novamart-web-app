export async function loadCleverTap() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const module = await import("clevertap-web-sdk");
    return module.default ?? module;
  } catch (error) {
    console.warn("Unable to load CleverTap SDK:", error);
    return null;
  }
}

export async function trackCleverTapEvent(eventName: string, properties?: Record<string, unknown>) {
  const clevertap = await loadCleverTap();
  if (!clevertap) {
    return;
  }

  try {
    clevertap.event.push(eventName, properties || {});
  } catch (error) {
    console.warn(`Failed to send CleverTap event ${eventName}:`, error);
  }
}
