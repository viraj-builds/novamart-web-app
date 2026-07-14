"use client";

import { useEffect } from "react";
import { useStore } from "@/store/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const accountId = process.env.NEXT_PUBLIC_CLEVERTAP_ACCOUNT_ID;
    const region = process.env.NEXT_PUBLIC_CLEVERTAP_REGION || "eu1";

    if (!accountId) {
      console.warn("CleverTap account ID is not configured.");
      return;
    }

    let isMounted = true;

    async function initCleverTap() {
      try {
        const clevertap = (await import("clevertap-web-sdk")).default;
        if (!isMounted) return;

        clevertap.privacy.push({ optOut: false });
        clevertap.privacy.push({ useIP: false });
        clevertap.spa = true;
        clevertap.init(accountId, region);
        console.info("CleverTap initialized", { accountId, region });
      } catch (error) {
        console.warn("CleverTap initialization failed:", error);
      }
    }

    initCleverTap();

    return () => {
      isMounted = false;
    };
  }, []);

  return <>{children}</>;
}
