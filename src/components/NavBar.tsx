"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/components/CurrencyContext";
import { localeLabels, locales } from "@/lib/i18n";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { createBrowserClient } from "@/lib/supabase/client";
import { getGuestCartCount } from "@/lib/guest-cart";
import type { User } from "@supabase/supabase-js";
import type { WatchCategory } from "@/lib/watch-categories";

type NavLabels = {
  home: string;
  shop: string;
  configurator: string;
  allWatches: string;
  contact: string;
  account: string;
  cart: string;
  signIn: string;
  createAccount: string;
  logout: string;
};

const navItems = [
  { key: "home", href: "" },
  { key: "contact", href: "contact" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  /** On mobile: navbar stays hidden until user taps the menu button; scroll (any direction) hides it again. */
  const [mobileNavRevealed, setMobileNavRevealed] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const [isMobileView, setIsMobileView] = useState(false);
  const isMobileRef = useRef(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => {
      isMobileRef.current = mql.matches;
      setIsMobileView(mql.matches);
    };
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!user) {
      setCartCount(getGuestCartCount());
      return;
    }
    const supabase = createBrowserClient();
    supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const total = (data ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
        setCartCount(total);
      });
  }, [user, pathname]);

  useEffect(() => {
    const onCartUpdate = () => {
      if (user) {
        const supabase = createBrowserClient();
        supabase
          .from("cart_items")
          .select("quantity")
          .eq("user_id", user.id)
          .then(({ data }) => {
            const total = (data ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
            setCartCount(total);
          });
      } else {
        setCartCount(getGuestCartCount());
      }
    };
    window.addEventListener("cart-updated", onCartUpdate);
    return () => window.removeEventListener("cart-updated", onCartUpdate);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (isMobileRef.current) {
        setMobileNavRevealed(false);
      } else {
        if (currentScrollY > lastScrollY.current && currentScrollY > scrollThreshold) {
          setHidden(true);
        } else if (currentScrollY < lastScrollY.current) {
          setHidden(false);
        }
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileNavRevealed(false);
  }, [pathname]);

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

  const headerHidden = isMobileView ? !mobileNavRevealed : hidden;

  return (
    <>
      {/* Mobile: floating menu button when navbar is hidden */}
      <button
        type="button"
        onClick={() => setMobileNavRevealed(true)}
        className={`fixed top-4 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[var(--logo-green)] text-white shadow-lg transition hover:border-white hover:text-white md:hidden ${headerHidden ? "" : "hidden"}`}
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    <header
      className={`fixed left-0 right-0 top-0 z-50 w-full border-b border-white/20 bg-[var(--logo-green)] transition-transform duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      {/* Full-width top bar: left nav | center logo | right account + locale + cart */}
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-2.5">
        <nav className="hidden items-center justify-start gap-6 text-sm uppercase tracking-[0.2em] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={`/${activeLocale}/${item.href}`}
              className="text-white/90 transition hover:text-white"
            >
              {labels[item.key as keyof NavLabels]}
            </Link>
          ))}
        </nav>
        <Link
          href={`/${activeLocale}`}
          className="flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
          aria-label="Ciavaglia Timepieces"
        >
          <Image
            src="/images/logo.png"
            alt="Ciavaglia Timepieces"
            width={160}
            height={48}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center justify-end gap-2 md:gap-4">
          {/* Cart: always visible on mobile; on desktop it's in the nav block below */}
          <Link
            href={`/${activeLocale}/cart`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white/90 transition hover:border-white hover:text-white md:hidden"
            aria-label={labels.cart}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-[var(--logo-gold)]"
                aria-hidden
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white/90 transition hover:border-white hover:text-white md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link
                href={`/${activeLocale}/account/manage`}
                className="rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
              >
                {labels.account}
              </Link>
              {isAdmin && (
                <Link
                  href={`/${activeLocale}/account/admin`}
                  className="btn-hover rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="btn-hover rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
              >
                {labels.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${activeLocale}/account/login`}
                className="btn-hover rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
              >
                {labels.signIn}
              </Link>
              <Link
                href={`/${activeLocale}/account/sign-up`}
                className="btn-hover rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
              >
                {labels.createAccount}
              </Link>
            </>
          )}
          <CurrencySwitcher />
          <LocaleSwitcher currentLocale={activeLocale} />
          <Link
            href={`/${activeLocale}/cart`}
            className="relative flex items-center gap-2 rounded-full border border-white/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/90 transition hover:border-white hover:text-white"
            aria-label={labels.cart}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold text-[var(--logo-gold)]"
              aria-hidden
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-white/20 bg-[var(--logo-green)] px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4 text-sm uppercase tracking-[0.2em] text-white/90">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={`/${activeLocale}/${item.href}`}
                className="transition hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {labels[item.key as keyof NavLabels]}
              </Link>
            ))}
            <div className="h-px bg-white/20" />
            <Link
              href={`/${activeLocale}/configurator`}
              className="transition hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {labels.configurator}
            </Link>
            <Link
              href={`/${activeLocale}/shop`}
              className="transition hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {labels.allWatches}
            </Link>
            {watchCategories.map((cat) => {
              const label = activeLocale === "fr" ? cat.label_fr : cat.label_en;
              return (
                <Link
                  key={cat.id}
                  href={`/${activeLocale}/shop/${cat.slug}`}
                  className="transition hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
            <div className="h-px bg-white/20" />
            {user ? (
              <>
                <Link
                  href={`/${activeLocale}/account/manage`}
                  className="transition hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {labels.account}
                </Link>
                {isAdmin && (
                  <Link
                    href={`/${activeLocale}/account/admin`}
                    className="transition hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await handleLogout();
                  }}
                  className="text-left transition hover:text-white"
                >
                  {labels.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${activeLocale}/account/login`}
                  className="transition hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {labels.signIn}
                </Link>
                <Link
                  href={`/${activeLocale}/account/sign-up`}
                  className="transition hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {labels.createAccount}
                </Link>
              </>
            )}
            <Link
              href={`/${activeLocale}/cart`}
              className="flex items-center gap-3 transition hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <span>{labels.cart}</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold text-[var(--logo-gold)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            </Link>
            <div className="h-px bg-white/20" />
            <CurrencySwitcher />
            <LocaleSwitcher currentLocale={activeLocale} />
          </div>
        </div>
      )}
      {!isAdminCentre && (
        <>
          <div className="border-t border-white/20" />
          {/* Watch styles row – full width */}
          <div className="border-t border-white/20 bg-[var(--logo-green)] px-6 py-2">
            <div className="flex w-full flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link
                href={`/${activeLocale}/configurator`}
                className="text-xs uppercase tracking-[0.2em] text-white/80 transition hover:text-white"
              >
                {labels.configurator}
              </Link>
              <Link
                href={`/${activeLocale}/shop`}
                className="text-xs uppercase tracking-[0.2em] text-white/80 transition hover:text-white"
              >
                {labels.allWatches}
              </Link>
              {watchCategories.map((cat) => {
                const label = activeLocale === "fr" ? cat.label_fr : cat.label_en;
                return (
                  <Link
                    key={cat.id}
                    href={`/${activeLocale}/shop/${cat.slug}`}
                    className="text-xs uppercase tracking-[0.2em] text-white/80 transition hover:text-white"
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </header>
    </>
  );
}

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.2em]">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c as CurrencyCode)}
          className={`px-2 py-1 transition ${currency === c ? "text-white" : "text-white/50 hover:text-white/80"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.2em]">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}/${rest}`.replace(/\/$/, "")}
          className={`px-2 py-1 transition ${currentLocale === locale ? "text-white" : "text-white/50"}`}
        >
          {localeLabels[locale].slice(0, 2)}
        </Link>
      ))}
    </div>
  );
}
