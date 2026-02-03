"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { localeLabels, locales } from "@/lib/i18n";
import { createBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { WatchCategory } from "@/lib/watch-categories";

type NavLabels = {
  home: string;
  shop: string;
  configurator: string;
  allWatches: string;
  contact: string;
  blog: string;
  account: string;
  cart: string;
  signIn: string;
  createAccount: string;
  logout: string;
};

const navItems = [
  { key: "home", href: "" },
  { key: "shop", href: "shop" },
  { key: "configurator", href: "configurator" },
  { key: "contact", href: "contact" },
  { key: "blog", href: "blog" },
];

export default function NavBar({
  locale,
  labels,
  isAdmin = false,
  watchCategories = [],
}: {
  locale: string;
  labels: NavLabels;
  isAdmin?: boolean;
  watchCategories?: WatchCategory[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = locale || pathname?.split("/").filter(Boolean)[0] || "en";
  const isAdminCentre = pathname?.includes("/account/admin") ?? false;
  const [hidden, setHidden] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }
    const supabase = createBrowserClient();
    supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setCartCount(count ?? 0));
  }, [user, pathname]);

  useEffect(() => {
    const onCartUpdate = () => {
      if (!user) return;
      const supabase = createBrowserClient();
      supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count }) => setCartCount(count ?? 0));
    };
    window.addEventListener("cart-updated", onCartUpdate);
    return () => window.removeEventListener("cart-updated", onCartUpdate);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > scrollThreshold) {
        setHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(`/${activeLocale}`);
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 bg-white transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href={`/${activeLocale}`}
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-foreground/30 rounded"
          aria-label="Ciavaglia Timepieces"
        >
          <Image
            src="/images/logo.png"
            alt="Ciavaglia Timepieces"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm uppercase tracking-[0.2em] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={`/${activeLocale}/${item.href}`}
              className="text-foreground/80 transition hover:text-foreground"
            >
              {labels[item.key as keyof NavLabels]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href={user ? `/${activeLocale}/cart` : `/${activeLocale}/account/login`}
            className="relative flex items-center gap-1 rounded-full border border-foreground/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
            aria-label={labels.cart}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          {user ? (
              <>
                <Link
                  href={`/${activeLocale}/account/manage`}
                  className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                >
                  {labels.account}
                </Link>
                {isAdmin && (
                  <Link
                    href={`/${activeLocale}/account/admin`}
                    className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                >
                  {labels.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${activeLocale}/account/login`}
                  className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                >
                  {labels.signIn}
                </Link>
                <Link
                  href={`/${activeLocale}/account/sign-up`}
                  className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                >
                  {labels.createAccount}
                </Link>
              </>
            )}
          <LocaleSwitcher currentLocale={activeLocale} />
        </div>
      </div>
      {!isAdminCentre && (
        <>
          <div className="mx-6 border-t border-foreground/10"></div>
          {/* Watch styles row – configurator, shop, then each category from DB */}
          <div className="border-t border-foreground/10 bg-white px-6 py-3">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link
                href={`/${activeLocale}/configurator`}
                className="text-xs uppercase tracking-[0.2em] text-foreground/70 transition hover:text-foreground"
              >
                {labels.configurator}
              </Link>
              <Link
                href={`/${activeLocale}/shop`}
                className="text-xs uppercase tracking-[0.2em] text-foreground/70 transition hover:text-foreground"
              >
                {labels.shop}
              </Link>
              {watchCategories.map((cat) => {
                const label = activeLocale === "fr" ? cat.label_fr : cat.label_en;
                return (
                  <Link
                    key={cat.id}
                    href={`/${activeLocale}/shop/${cat.slug}`}
                    className="text-xs uppercase tracking-[0.2em] text-foreground/70 transition hover:text-foreground"
                  >
                    {label}
                  </Link>
                );
              })}
              <Link
                href={`/${activeLocale}/shop`}
                className="text-xs uppercase tracking-[0.2em] text-foreground/70 transition hover:text-foreground"
              >
                {labels.allWatches}
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");

  return (
    <div className="flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-2 py-1 text-xs uppercase tracking-[0.2em]">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}/${rest}`.replace(/\/$/, "")}
          className={`px-2 py-1 transition ${currentLocale === locale ? "text-foreground" : "text-foreground/40"}`}
        >
          {localeLabels[locale].slice(0, 2)}
        </Link>
      ))}
    </div>
  );
}
