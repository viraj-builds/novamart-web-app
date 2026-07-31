"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Unread count for the CleverTap Web Inbox.
 *
 * The SDK ships its own badge, but it appends a position:absolute div to
 * document.body and only repositions it on `resize` — so it drifts as soon as the
 * page scrolls or the header is sticky. `getInboxMessageUnreadCount()` is the
 * documented API, so we read that and render the dot on the bell ourselves.
 *
 * There is no "inbox updated" event on the SDK (it only dispatches
 * CT_web_native_display*), so this polls. The call just reads localStorage.
 */
export function useInboxUnreadCount(pollMs = 3000) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    const clevertap = typeof window === "undefined" ? null : window.clevertap;
    if (typeof clevertap?.getInboxMessageUnreadCount !== "function") return;

    try {
      const count = clevertap.getInboxMessageUnreadCount();
      setUnreadCount(typeof count === "number" && count > 0 ? count : 0);
    } catch {
      // The inbox is not initialised yet; the next poll will pick it up.
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  return { unreadCount, refresh };
}
