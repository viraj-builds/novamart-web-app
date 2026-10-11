"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { COUNTRY_CODES, toE164 } from "@/lib/user-profile";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to sign in. Please check your email and password.";
}

const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let e164: string | undefined;
    if (mode === "register" && phone.trim()) {
      e164 = toE164(countryCode, phone) ?? undefined;
      if (!e164) {
        setError("Enter a valid mobile number for the selected country.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, { name, phone: e164 });
      }
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-slate-400">Loading auth...</div>;
  }

  return (
    <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#111827] p-8">
      <h1 className="text-3xl font-semibold text-white">{mode === "login" ? "Sign In" : "Create Account"}</h1>
      <p className="mt-2 text-slate-400">Use your email and password to access NovaMart.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="text-sm text-slate-400">Full name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} />
          </label>
        )}
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className={inputClass} />
        </label>
        {mode === "register" && (
          <div className="block">
            <span className="text-sm text-slate-400">Mobile number</span>
            <div className="mt-2 flex gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0b1220] px-3 py-3 text-white outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                aria-label="Mobile number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98765 43210"
                className="w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none"
              />
            </div>
            <span className="mt-1 block text-xs text-slate-500">Optional. Saved with the country code, e.g. +919876543210.</span>
          </div>
        )}
        <label className="block">
          <span className="text-sm text-slate-400">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
        >
          {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div className="mt-4 text-center text-sm text-slate-400">
        <button
          type="button"
          className="font-semibold text-white underline"
          onClick={() => {
            setError(null);
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
