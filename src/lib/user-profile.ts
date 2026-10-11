"use client";

/**
 * Profile details NovaMart keeps for a signed-in user (Firebase Auth only stores
 * email + display name). Saved per uid in this browser; CleverTap gets the same
 * values through onUserLogin (login / sign-up) and profile.push (profile edits).
 */
export type Gender = "M" | "F" | "O";

export type UserProfile = {
  name?: string;
  phone?: string; // always E.164, e.g. +919876543210
  gender?: Gender;
  dob?: string; // yyyy-mm-dd from <input type="date">
  city?: string;
  favouriteCategory?: string;
  msgEmail?: boolean;
  msgPush?: boolean;
  msgSms?: boolean;
  msgWhatsapp?: boolean;
};

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", digits: 10 },
  { code: "+1", label: "US / Canada (+1)", digits: 10 },
  { code: "+44", label: "UK (+44)", digits: 10 },
  { code: "+971", label: "UAE (+971)", digits: 9 },
  { code: "+65", label: "Singapore (+65)", digits: 8 },
  { code: "+62", label: "Indonesia (+62)", digits: 11 },
];

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * CleverTap only treats a phone as reachable (SMS / WhatsApp) in E.164: "+" and the
 * country code, digits only. Accepts what people type ("98765 43210", "09876543210",
 * "+91-98765-43210") and returns null when it can't be made valid.
 */
export function toE164(countryCode: string, input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return E164.test(digits) ? digits : null;
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.startsWith("+")) return E164.test(digits) ? digits : null;
  digits = digits.replace(/^0+/, "");
  const cc = countryCode.replace(/\D/g, "");
  if (digits.startsWith(cc) && digits.length > cc.length + 6) digits = digits.slice(cc.length);
  const full = `+${cc}${digits}`;
  return E164.test(full) ? full : null;
}

/** Split a stored E.164 phone back into the country code + national number for the form. */
export function splitPhone(phone?: string): { countryCode: string; number: string } {
  if (!phone) return { countryCode: "+91", number: "" };
  const match = COUNTRY_CODES.slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => phone.startsWith(c.code));
  return match ? { countryCode: match.code, number: phone.slice(match.code.length) } : { countryCode: "+91", number: phone.replace(/^\+/, "") };
}

const key = (uid: string) => `novamart_profile_${uid}`;

export function readProfile(uid: string): UserProfile {
  try {
    const raw = window.localStorage.getItem(key(uid));
    return raw ? (JSON.parse(raw) as UserProfile) : {};
  } catch {
    return {};
  }
}

export function saveProfile(uid: string, profile: UserProfile): UserProfile {
  const next = { ...readProfile(uid), ...profile };
  try {
    window.localStorage.setItem(key(uid), JSON.stringify(next));
  } catch {
    // storage blocked — CleverTap still has the values
  }
  return next;
}
