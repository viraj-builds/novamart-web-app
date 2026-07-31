"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/store";
import { initCleverTap, promptForWebPush } from "@/lib/clevertap";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

    const resolvedAccountId = accountId;
    let isMounted = true;

    async function initClient() {
      if (!isMounted) return;
      await initCleverTap(resolvedAccountId, region);
      if (!isMounted) return;
      await promptForWebPush();
    }

    initClient();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.clevertap?.pageChanged === "function") {
      window.clevertap.pageChanged();
    }
  }, [pathname]);

  return <>{children}</>;
}
