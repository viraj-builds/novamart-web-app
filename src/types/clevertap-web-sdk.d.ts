declare module "clevertap-web-sdk" {
  export interface CleverTapWeb {
    event: { push: (name: string, properties?: Record<string, unknown>) => void };
    profile?: { push: (profile: Record<string, unknown>) => void };
    onUserLogin: { push: (profile: Record<string, unknown>) => void };
    privacy: { push: (settings: Record<string, unknown>) => void };
    notifications: { push: (config: Record<string, unknown>) => void };
    init: (accountId: string, region?: string, targetDomain?: string, token?: string, config?: Record<string, unknown>) => void;
    toggleInbox?: (options?: unknown) => void;
    enableWebPush?: (enabled: boolean, key?: string) => void;
    renderNotificationViewed?: (payload: { msgId: string; pivotId?: string }) => void;
    [key: string]: unknown;
  }

  const clevertap: CleverTapWeb;
  export default clevertap;
}

declare global {
  interface Window {
    clevertap?: import("clevertap-web-sdk").CleverTapWeb;
    wizrocket?: import("clevertap-web-sdk").CleverTapWeb;
  }
}
