export interface CleverTapWeb {
  event: { push: (name: string, properties?: Record<string, unknown>) => void };
  profile?: { push: (profile: Record<string, unknown>) => void };
  onUserLogin: { push: (profile: Record<string, unknown>) => void };
  privacy: { push: (settings: Record<string, unknown>) => void };
  notifications: { push: (config: Record<string, unknown>) => void };
  init: (accountId: string, region?: string, targetDomain?: string, token?: string, config?: Record<string, unknown>) => void;
  pageChanged?: () => void;
  toggleInbox?: (options?: unknown) => void;
  enableWebPush?: (enabled: boolean, key?: string) => void;
  getInboxMessageUnreadCount?: () => number;
  getInboxMessageCount?: () => number;
  renderNotificationViewed?: (payload: { msgId: string; pivotId?: string }) => void;
  [key: string]: unknown;
}

export async function loadCleverTap(): Promise<CleverTapWeb | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const clevertapModule = await import("clevertap-web-sdk");
    return (clevertapModule.default ?? clevertapModule) as CleverTapWeb;
  } catch (error) {
    console.warn("Unable to load CleverTap SDK:", error);
    return null;
  }
}

export function getGlobalCleverTap(): CleverTapWeb | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.clevertap ?? null;
}

async function getCleverTapInstance(): Promise<CleverTapWeb | null> {
  return getGlobalCleverTap() ?? loadCleverTap();
}

export async function initCleverTap(accountId: string, region = "eu1") {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  try {
    clevertap.privacy.push({ optOut: false });
    clevertap.privacy.push({ useIP: false });
    clevertap.spa = true;
    // Required for Web Native Display and any personalisation/profile-getter API.
    clevertap.enablePersonalization = true;
    clevertap.init(accountId, region);

    if (typeof clevertap.enableWebPush === "function") {
      clevertap.enableWebPush(true);
    }

    clevertap.notifications.push({
      titleText: "Would you like to receive Push Notifications?",
      bodyText: "We promise to only send you relevant updates.",
      okButtonText: "Allow",
      rejectButtonText: "No thanks",
      askAgainTimeInSeconds: 5,
      serviceWorkerPath: "/clevertap_sw.js",
    });

    if (typeof window !== "undefined") {
      window.clevertap = clevertap;
      window.wizrocket = clevertap;
    }

    if (typeof clevertap.pageChanged === "function") {
      clevertap.pageChanged();
    }
  } catch (error) {
    console.warn("Failed to initialize CleverTap:", error);
  }
}

/**
 * Raises the web push opt-in prompt. Keep this out of `initCleverTap` so the
 * prompt is tied to a deliberate moment (a signed-in user, a button) rather than
 * firing on every cold page load — browsers penalise the latter.
 *
 * When the dashboard uses the "new" web push box, its title/body/button copy comes
 * from the dashboard; the values below only apply to the legacy box.
 */
function getApnsConfig() {
  const apnsWebPushId = process.env.NEXT_PUBLIC_CLEVERTAP_APNS_WEB_PUSH_ID;
  const apnsWebPushServiceUrl = process.env.NEXT_PUBLIC_CLEVERTAP_APNS_SERVICE_URL;
  // Safari on macOS needs both APNs values; omitting them leaves Safari unsupported.
  return apnsWebPushId && apnsWebPushServiceUrl ? { apnsWebPushId, apnsWebPushServiceUrl } : {};
}

/**
 * The application server (VAPID) key normally arrives from CleverTap's own response,
 * which calls `enableWebPush(enabled, key)` and only then populates the SDK's
 * internal key. Anything that subscribes before that lands calls
 * pushManager.subscribe() with no key and the browser rejects with
 * "Registration failed - missing applicationServerKey".
 *
 * Applying the env key first makes the subscribe independent of that timing.
 */
function applyVapidKey(clevertap: CleverTapWeb) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_CLEVERTAP_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey || typeof clevertap.enableWebPush !== "function") {
    return;
  }

  try {
    clevertap.enableWebPush(true, vapidPublicKey);
  } catch (error) {
    console.warn("Failed to set the CleverTap web push VAPID key:", error);
  }
}

export async function promptForWebPush() {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  const { apnsWebPushId, apnsWebPushServiceUrl } = getApnsConfig() as {
    apnsWebPushId?: string;
    apnsWebPushServiceUrl?: string;
  };

  applyVapidKey(clevertap);

  try {
    clevertap.notifications.push({
      titleText: "Would you like to receive Push Notifications?",
      bodyText: "We promise to only send you relevant updates.",
      okButtonText: "Allow",
      rejectButtonText: "No thanks",
      askAgainTimeInSeconds: 60 * 60 * 24 * 7,
      serviceWorkerPath: "/clevertap_sw.js",
      // Safari on macOS needs both APNs values; omitting them leaves Safari unsupported.
      ...(apnsWebPushId && apnsWebPushServiceUrl ? { apnsWebPushId, apnsWebPushServiceUrl } : {}),
    });
  } catch (error) {
    console.warn("Failed to raise the CleverTap web push prompt:", error);
  }
}

/**
 * Re-attaches the push subscription to the profile that onUserLogin just switched to.
 *
 * This is not optional. When onUserLogin changes the identity, the SDK swaps the
 * guid and calls `unregisterTokenForGuid(previousGuid)` — it strips the push token
 * off the profile it was registered against. Nothing in the SDK ever re-registers
 * it, so a user who allowed notifications while anonymous ends up signed in with
 * NO token, and every push campaign reports "Push Unregistered from the profile".
 *
 * `skipDialog: true` goes straight to the subscription without re-showing the
 * opt-in box — the SDK uses the same trick internally after an unsubscribe.
 */
export async function reRegisterWebPushForCurrentUser() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return;
  }

  // Nothing to re-register unless the user already granted permission.
  if (Notification.permission !== "granted") {
    return;
  }

  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  // Must run before notifications.push, or the subscribe can go out without a key.
  applyVapidKey(clevertap);

  try {
    clevertap.notifications.push({
      skipDialog: true,
      serviceWorkerPath: "/clevertap_sw.js",
      ...getApnsConfig(),
    });
  } catch (error) {
    console.warn("Failed to re-register the CleverTap web push token:", error);
  }
}

export async function trackCleverTapEvent(eventName: string, properties?: Record<string, unknown>) {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  try {
    clevertap.event.push(eventName, properties || {});
  } catch (error) {
    console.warn(`Failed to send CleverTap event ${eventName}:`, error);
  }
}

export async function sendCleverTapLoginProfile(profile: Record<string, unknown>) {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  try {
    clevertap.onUserLogin.push(profile);
  } catch (error) {
    console.warn("Failed to push CleverTap login profile:", error);
  }
}

/*
 * There is deliberately no openInbox() helper here. `clevertap.toggleInbox()`
 * derives the inbox position from the click event it is passed; calling it with no
 * argument throws inside setInboxPosition. The supported integration is to give the
 * trigger element the id configured on the campaign and let the SDK's own document
 * click listener handle it — see the bell button in MainShell.
 */
