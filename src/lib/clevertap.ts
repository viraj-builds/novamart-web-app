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
    clevertap.init(accountId, region);

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
  } catch (error) {
    console.warn("Failed to initialize CleverTap:", error);
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

export async function openCleverTapInbox() {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  try {
    if (typeof clevertap.toggleInbox === "function") {
      clevertap.toggleInbox();
      return;
    }

    if (typeof window !== "undefined" && typeof window.clevertap?.toggleInbox === "function") {
      window.clevertap.toggleInbox();
      return;
    }

    console.warn("CleverTap inbox is not ready yet.");
  } catch (error) {
    console.warn("Failed to open CleverTap inbox:", error);
  }
}
