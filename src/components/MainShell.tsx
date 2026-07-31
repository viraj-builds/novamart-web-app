"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, ShoppingBag, Heart, UserRound, SlidersHorizontal } from "lucide-react";
import { Providers } from "@/app/Providers";
import { useStore } from "@/store/store";
import { useAuth } from "@/lib/use-auth";
import { useInboxUnreadCount } from "@/lib/use-inbox-unread";

export function MainShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const cartCount = useStore((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
  const wishlistCount = useStore((state) => state.wishlist.length);
  const { unreadCount, refresh: refreshUnreadCount } = useInboxUnreadCount();
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/cart", label: "Cart", icon: ShoppingBag },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: user ? "/profile" : "/login", label: user ? "Profile" : "Login", icon: UserRound },
  ];

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-10 text-slate-300 shadow-lg">
            <p className="text-lg font-medium">Checking your login status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Providers>
      <div className="min-h-screen bg-[#050816] text-slate-100">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-lg font-semibold text-white">
                N
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide">NovaMart</p>
                <p className="text-sm text-slate-400">Shop everything you want</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {navItems.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${active ? "bg-orange-500 text-black" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}
                  >
                    {label}
                  </Link>
                );
              })}
              {/*
                This id must match the "Element ID" set on the Web Inbox campaign in
                the CleverTap dashboard. The SDK attaches its own document click
                listener, works out the anchor's position from the click event, and
                toggles the inbox itself — and it hangs the unread badge here too.
                Do NOT add an onClick calling clevertap.toggleInbox(): called without
                an event it throws "Cannot read properties of undefined (reading
                'rect')" inside setInboxPosition.
              */}
              <button
                type="button"
                id="clevertap-web-inbox"
                className="relative rounded-full border border-white/10 bg-white/5 p-2.5"
                aria-label={
                  unreadCount > 0
                    ? `Open web inbox, ${unreadCount} unread`
                    : "Open web inbox"
                }
                onClick={() => window.setTimeout(refreshUnreadCount, 500)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <button className="rounded-full border border-white/10 bg-white/5 p-2.5" aria-label="Filters">
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <nav className="sticky bottom-0 z-30 border-t border-white/10 bg-[#050816]/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-around px-2 py-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              const badge = href === "/cart" ? cartCount : href === "/wishlist" ? wishlistCount : 0;
              return (
                <Link key={href} href={href} className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium ${active ? "text-orange-400" : "text-slate-400"}`}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className="absolute right-1 top-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </Providers>
  );
}
