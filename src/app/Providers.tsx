"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/store";
import {
  initCleverTap,
  promptForWebPush,
  reRegisterWebPushForCurrentUser,
} from "@/lib/clevertap";

/** Time for CleverTap's response — which carries the VAPID key — to land after init. */
const PUSH_CONFIG_SETTLE_MS = 3000;

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
    let pushTimer: number | undefined;

    async function initClient() {
      if (!isMounted) return;
      await initCleverTap(resolvedAccountId, region);
      if (!isMounted) return;

      // Already opted in: don't re-ask, just make sure the token is attached to
      // whichever profile the SDK is currently on.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        pushTimer = window.setTimeout(() => {
          void reRegisterWebPushForCurrentUser();
        }, PUSH_CONFIG_SETTLE_MS);
      } else {
        await promptForWebPush();
      }

      if (typeof window.clevertap?.pageChanged === "function") {
        window.clevertap.pageChanged();
      }
    }

    initClient();

    return () => {
      isMounted = false;
      if (pushTimer !== undefined) window.clearTimeout(pushTimer);
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
