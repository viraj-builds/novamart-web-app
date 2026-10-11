"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { useAuth } from "@/lib/use-auth";
import { promptForWebPush, shareLocationWithCleverTap, updateCleverTapProfile } from "@/lib/clevertap";
import { COUNTRY_CODES, readProfile, saveProfile, splitPhone, toE164, type Gender, type UserProfile } from "@/lib/user-profile";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Sports", "Books"];
const field = "mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-[#111827] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Welcome back{user.displayName ? `, ${user.displayName}` : ""}</h1>
            <p className="mt-2 text-slate-400">Signed in as {user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Log out
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-1 font-semibold text-white">{user.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
            <p className="text-sm text-slate-400">Member since</p>
            <p className="mt-1 font-semibold text-white">{new Date(user.metadata.creationTime || "").toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* key on uid so the form re-reads saved values when the user changes */}
      <ProfileForm key={user.uid} uid={user.uid} displayName={user.displayName} onNameSaved={(name) => updateFirebaseProfile(user, { displayName: name })} />
      <Preferences />
    </div>
  );
}

function ProfileForm({ uid, displayName, onNameSaved }: { uid: string; displayName: string | null; onNameSaved: (name: string) => Promise<void> }) {
  const [initial] = useState<UserProfile>(() => readProfile(uid));
  const initialPhone = splitPhone(initial.phone);
  const [name, setName] = useState(initial.name ?? displayName ?? "");
  const [countryCode, setCountryCode] = useState(initialPhone.countryCode);
  const [phone, setPhone] = useState(initialPhone.number);
  const [gender, setGender] = useState<Gender | "">(initial.gender ?? "");
  const [dob, setDob] = useState(initial.dob ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [category, setCategory] = useState(initial.favouriteCategory ?? "");
  const [msgEmail, setMsgEmail] = useState(initial.msgEmail ?? true);
  const [msgPush, setMsgPush] = useState(initial.msgPush ?? true);
  const [msgSms, setMsgSms] = useState(initial.msgSms ?? false);
  const [msgWhatsapp, setMsgWhatsapp] = useState(initial.msgWhatsapp ?? false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    let e164: string | undefined;
    if (phone.trim()) {
      e164 = toE164(countryCode, phone) ?? undefined;
      if (!e164) {
        setStatus({ ok: false, text: "Enter a valid mobile number for the selected country." });
        return;
      }
    }
    setSaving(true);
    const next: UserProfile = {
      name: name.trim() || undefined,
      phone: e164,
      gender: gender || undefined,
      dob: dob || undefined,
      city: city.trim() || undefined,
      favouriteCategory: category || undefined,
      msgEmail,
      msgPush,
      msgSms,
      msgWhatsapp,
    };
    try {
      saveProfile(uid, next);
      if (next.name && next.name !== displayName) await onNameSaved(next.name).catch(() => {});
      await updateCleverTapProfile(next);
      setStatus({ ok: true, text: "Profile saved." });
    } catch {
      setStatus({ ok: false, text: "Couldn't save your profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-[28px] border border-white/10 bg-[#111827] p-6">
      <h2 className="text-xl font-semibold text-white">Your details</h2>
      <p className="mt-1 text-sm text-slate-400">Used to personalise offers and reach you on the channels you pick.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
        </label>
        <div className="block">
          <span className="text-sm text-slate-400">Mobile number</span>
          <div className="mt-2 flex gap-2">
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-3 py-3 text-white outline-none"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <input
              aria-label="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none"
            />
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-400">Gender</span>
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} className={field}>
            <option value="">Prefer not to say</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Date of birth</span>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Favourite category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">No preference</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm text-slate-400">Send me offers by</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {(
            [
              ["Email", msgEmail, setMsgEmail],
              ["Push notifications", msgPush, setMsgPush],
              ["SMS", msgSms, setMsgSms],
              ["WhatsApp", msgWhatsapp, setMsgWhatsapp],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0b1220] px-4 py-2 text-sm text-slate-200">
              <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} className="accent-orange-500" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {status && (
          <p role="status" className={`text-sm ${status.ok ? "text-emerald-400" : "text-red-400"}`}>
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Preferences() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [location, setLocation] = useState<string | null>(null);

  // Read after mount (there is no Notification on the server) and follow changes.
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const read = () => setPermission(Notification.permission);
    read();
    const t = window.setInterval(read, 1500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#111827] p-6">
      <h2 className="text-xl font-semibold text-white">Notifications and location</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
          <p className="text-sm text-slate-400">Browser notifications</p>
          <p className="mt-1 font-semibold text-white">
            {permission === "granted" ? "On" : permission === "denied" ? "Blocked in browser settings" : permission === "unsupported" ? "Not supported here" : "Off"}
          </p>
          {permission === "default" && (
            <button type="button" onClick={() => void promptForWebPush()} className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">
              Turn on notifications
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
          <p className="text-sm text-slate-400">Location for local offers</p>
          <p className="mt-1 font-semibold text-white">{location ?? "Approximate (from your network)"}</p>
          <button
            type="button"
            onClick={async () => setLocation((await shareLocationWithCleverTap()) ? "Shared — check your browser's prompt" : "Not available")}
            className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            Use my precise location
          </button>
        </div>
      </div>
    </div>
  );
}
