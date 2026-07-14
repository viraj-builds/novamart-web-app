"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to sign in. Please check your email and password.";
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err));
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
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400">
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div className="mt-4 text-center text-sm text-slate-400">
        <button type="button" className="font-semibold text-white underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>\
          {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
