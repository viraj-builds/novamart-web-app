import type { UserProfile } from "@/lib/user-profile";

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
  getLocation?: () => void;
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

let initPromise: Promise<void> | null = null;

/**
 * Idempotent: Providers can mount more than once (StrictMode, nested layouts), and a
 * second clevertap.init() would re-run the SDK's bootstrap against the same account.
 */
export function initCleverTap(accountId: string, region = "eu1") {
  initPromise ??= runInitCleverTap(accountId, region);
  return initPromise;
}

async function runInitCleverTap(accountId: string, region: string) {
  const clevertap = await getCleverTapInstance();
  if (!clevertap) {
    return;
  }

  try {
    // GDPR flags (developer.clevertap.com/docs/advanced-configurations#gdpr). useIP lets
    // CleverTap derive city / country from the visitor's IP — without it web profiles
    // have no location at all. Set NEXT_PUBLIC_CLEVERTAP_USE_IP=false to turn it off.
    clevertap.privacy.push({ optOut: false });
    clevertap.privacy.push({ useIP: process.env.NEXT_PUBLIC_CLEVERTAP_USE_IP !== "false" });
    clevertap.spa = true;
    // Required for Web Native Display and any personalisation/profile-getter API.
    clevertap.enablePersonalization = true;
    clevertap.init(accountId, region);

    // Apply the VAPID public key immediately after init so it is available
    // before any subscription attempt. The key must be set here (not deferred)
    // because pushManager.subscribe() will fire without it if the CleverTap
    // backend response is slow, causing "missing applicationServerKey" errors.
    applyVapidKey(clevertap);

    if (typeof window !== "undefined") {
      window.clevertap = clevertap;
      window.wizrocket = clevertap;
    }

    if (typeof clevertap.pageChanged === "function") {
      clevertap.pageChanged();
    }
    // NOTE: Do NOT call clevertap.notifications.push() here.
    // Push opt-in prompts must be triggered by promptForWebPush() at a
    // deliberate moment (e.g. after login, after a transaction). Firing
    // on every cold load is penalised by browsers and guaranteed to race
    // against the VAPID key arriving from the CleverTap backend.
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

/**
 * onUserLogin swaps the guid on the server round-trip, so the push token has to be
 * re-registered *after* that has landed. There is no callback for it, hence the wait.
 */
const GUID_SWITCH_SETTLE_MS = 2500;
const IDENTIFIED_UID_KEY = "novamart_ct_identified_uid";
let identifiedUid: string | null = null;

function readIdentifiedUid() {
  try {
    return window.sessionStorage.getItem(IDENTIFIED_UID_KEY);
  } catch {
    return null;
  }
}

function writeIdentifiedUid(uid: string) {
  try {
    window.sessionStorage.setItem(IDENTIFIED_UID_KEY, uid);
  } catch {
    // Storage blocked; we just re-identify on the next load, which is harmless.
  }
}

export type CleverTapUser = { uid: string; email: string | null; displayName?: string | null; profile?: UserProfile };

/**
 * Turns NovaMart's profile into CleverTap's "Site" object. Empty values are left out
 * (CleverTap would store them and overwrite good data), the phone is already E.164,
 * and DOB goes as a Date so the SDK sends it as a real date ($D_epoch), not text.
 */
export function profileToSite(profile: UserProfile & { name?: string | null }): Record<string, unknown> {
  const site: Record<string, unknown> = {};
  if (profile.name?.trim()) site.Name = profile.name.trim();
  if (profile.phone) site.Phone = profile.phone;
  if (profile.gender) site.Gender = profile.gender;
  if (profile.dob) {
    const d = new Date(`${profile.dob}T00:00:00`);
    if (!Number.isNaN(d.getTime())) site.DOB = d;
  }
  if (profile.city?.trim()) site.City = profile.city.trim();
  if (profile.favouriteCategory) site["Favourite Category"] = profile.favouriteCategory;
  if (profile.msgEmail !== undefined) site["MSG-email"] = profile.msgEmail;
  if (profile.msgPush !== undefined) site["MSG-push"] = profile.msgPush;
  if (profile.msgSms !== undefined) site["MSG-sms"] = profile.msgSms;
  if (profile.msgWhatsapp !== undefined) site["MSG-whatsapp"] = profile.msgWhatsapp;
  return site;
}

/**
 * The single place onUserLogin is called. It runs for an explicit login/sign-up AND
 * for a user whose Firebase session was restored on page load — without the latter,
 * anyone who was already signed in (or signed in before the SDK was added) stays an
 * anonymous profile forever.
 *
 * Guarded to once per tab session per uid, so the login call and the restore call
 * that fires from onAuthStateChanged don't both switch the identity.
 */
export async function identifyCleverTapUser(user: CleverTapUser) {
  if (typeof window === "undefined") return;
  if (identifiedUid === user.uid || readIdentifiedUid() === user.uid) {
    identifiedUid = user.uid;
    return;
  }
  identifiedUid = user.uid;

  await (initPromise ?? Promise.resolve());
  // Only an initialised SDK is published on window; anything else has no account.
  const clevertap = getGlobalCleverTap();
  if (!clevertap) {
    identifiedUid = null;
    return;
  }

  // Never send empty values: CleverTap stores them, overwriting good data.
  const site: Record<string, unknown> = {
    "MSG-push": true,
    ...profileToSite({ ...user.profile, name: user.profile?.name ?? user.displayName ?? undefined }),
    Identity: user.uid,
  };
  if (user.email) site.Email = user.email;

  try {
    clevertap.onUserLogin.push({ Site: site });
    writeIdentifiedUid(user.uid);
  } catch (error) {
    identifiedUid = null;
    console.warn("Failed to push CleverTap login profile:", error);
    return;
  }

  // Re-attach the push token to the profile we just switched to, otherwise every
  // push campaign targeting this user has nothing to deliver to.
  window.setTimeout(() => {
    void reRegisterWebPushForCurrentUser();
  }, GUID_SWITCH_SETTLE_MS);
}

/*
 * There is deliberately no openInbox() helper here. `clevertap.toggleInbox()`
 * derives the inbox position from the click event it is passed; calling it with no
 * argument throws inside setInboxPosition. The supported integration is to give the
 * trigger element the id configured on the campaign and let the SDK's own document
 * click listener handle it — see the bell button in MainShell.
 */

/**
 * Profile edits outside login / sign-up go through profile.push — it updates the
 * profile that is already identified (onUserLogin is only for switching users).
 * Also raises "Profile Updated" so campaigns can react to it.
 */
export async function updateCleverTapProfile(profile: UserProfile & { name?: string | null }) {
  const clevertap = getGlobalCleverTap() ?? (await getCleverTapInstance());
  if (!clevertap?.profile) return;
  const site = profileToSite(profile);
  if (!Object.keys(site).length) return;
  try {
    clevertap.profile.push({ Site: site });
    clevertap.event.push("Profile Updated", { "Fields Updated": Object.keys(site).join(", ") });
  } catch (error) {
    console.warn("Failed to update the CleverTap profile:", error);
  }
}

/**
 * Asks the browser for the visitor's precise location and hands it to CleverTap
 * (lat / long on the profile). Only call it from a user action — browsers block
 * geolocation prompts that appear on their own.
 */
export async function shareLocationWithCleverTap() {
  const clevertap = getGlobalCleverTap() ?? (await getCleverTapInstance());
  if (typeof clevertap?.getLocation !== "function") return false;
  try {
    clevertap.getLocation();
    return true;
  } catch (error) {
    console.warn("Failed to share location with CleverTap:", error);
    return false;
  }
}
