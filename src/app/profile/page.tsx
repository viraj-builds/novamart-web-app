"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

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
    <div className="rounded-[28px] border border-white/10 bg-[#111827] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
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
  );
}
