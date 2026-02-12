"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyContext";
import {
  getGuestCart,
  setGuestCart,
  updateGuestCartQuantity,
  removeGuestCartItem,
} from "@/lib/guest-cart";

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  title: string | null;
  image_url: string | null;
  configuration?: unknown;
};

type CartLabels = {
  title: string;
  empty: string;
  continueShopping: string;
  subtotal: string;
  checkout: string;
  remove: string;
  quantity: string;
  editBuild?: string;
};

export default function CartView({ locale, labels }: { locale: string; labels: CartLabels }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currency, formatPrice } = useCurrency();
  const activeLocale = locale || pathname.split("/").filter(Boolean)[0] || "en";
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const fetchCart = async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const guestItems = getGuestCart().map((g) => ({
        id: g.id,
        product_id: g.product_id,
        quantity: g.quantity,
        price: g.price,
        title: g.title,
        image_url: g.image_url,
        configuration: g.configuration,
      }));
      setItems(guestItems);
      setIsGuest(true);
      setLoading(false);
      return;
    }
    setIsGuest(false);
    const { data, error: fetchError } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, price, title, image_url, configuration")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems(
        (data ?? []).map((r) => ({
          ...r,
          price: Number(r.price),
          quantity: Number(r.quantity),
          configuration: (r as { configuration?: unknown }).configuration,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    const item = items.find((i) => i.id === itemId);
    if (item?.product_id.startsWith("custom-") && quantity > 1) return;
    if (isGuest) {
      const next = updateGuestCartQuantity(itemId, quantity);
      setItems(next);
      window.dispatchEvent(new CustomEvent("cart-updated"));
      return;
    }
    const supabase = createBrowserClient();
    await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const removeItem = async (itemId: string) => {
    if (isGuest) {
      const next = removeGuestCartItem(itemId);
      setItems(next);
      window.dispatchEvent(new CustomEvent("cart-updated"));
      return;
    }
    const supabase = createBrowserClient();
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const body: Record<string, unknown> = {
        locale: activeLocale,
        type: "cart",
        currency,
      };
      if (user) {
        body.userId = user.id;
      } else {
        body.guestCart = items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          title: i.title,
          configuration: i.configuration,
        }));
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        if (isGuest) setGuestCart([]);
        window.location.href = data.url;
        return;
      }
      setError(typeof data?.error === "string" ? data.error : "Could not start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl text-center text-foreground/60">Loading…</div>
      </section>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-medium text-white">{labels.title}</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[22px] border-2 border-foreground/15 bg-white/80 p-10 text-center text-foreground">
            <p className="text-foreground/70">{labels.empty}</p>
            <Link
              href={`/${activeLocale}/shop`}
              className="btn-hover mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition hover:bg-foreground/90"
            >
              {labels.continueShopping}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 space-y-6">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 rounded-[22px] border border-foreground/15 bg-white p-4 text-foreground shadow-sm"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                    <Image
                      src={item.image_url ?? "/images/hero-1.svg"}
                      alt={item.title ?? ""}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized={item.image_url?.startsWith("http") ?? false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {(() => {
                      const cfg = item.configuration as { bracelet_title?: string; addons?: { option_label_en?: string; option_label_fr?: string; price?: number }[] } | undefined;
                      const variant = cfg?.bracelet_title;
                      const addons = Array.isArray(cfg?.addons) ? cfg.addons : [];
                      if (!variant && addons.length === 0) return null;
                      return (
                        <>
                          {variant && (
                            <p className="mt-0.5 text-sm text-foreground/70">
                              {activeLocale === "fr" ? "Variante" : "Variant"}: {variant}
                            </p>
                          )}
                          {addons.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-xs text-foreground/60">
                              {addons.map((a, i) => {
                                const label = activeLocale === "fr" ? (a as { option_label_fr?: string }).option_label_fr : (a as { option_label_en?: string }).option_label_en;
                                return (
                                  <li key={i}>
                                    + {label ?? (a as { option_label_en?: string }).option_label_en} ({formatPrice(Number((a as { price?: number }).price ?? 0))})
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      );
                    })()}
                    <p className="mt-0.5 text-sm text-foreground/70">{formatPrice(Number(item.price))} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="btn-hover flex h-8 w-8 items-center justify-center rounded-full border border-foreground/30 text-foreground/80 transition hover:border-foreground hover:bg-foreground/5"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="btn-hover flex h-8 w-8 items-center justify-center rounded-full border border-foreground/30 text-foreground/80 transition hover:border-foreground hover:bg-foreground/5"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-20 text-right font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.product_id.startsWith("custom-") && !item.id.startsWith("guest-") && (
                      <Link
                        href={`/${activeLocale}/configurator?edit=${encodeURIComponent(item.id)}`}
                        className="btn-hover rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
                      >
                        {labels.editBuild ?? "Edit build"}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="btn-hover rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                    >
                      {labels.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-end gap-4 rounded-[22px] border-2 border-foreground/15 bg-white p-6 text-foreground">
              {error && <p className="w-full text-sm text-red-600">{error}</p>}
              <p className="text-lg font-semibold">
                {labels.subtotal}: {formatPrice(subtotal)}
              </p>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="btn-hover rounded-full bg-foreground px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition hover:bg-foreground/90 disabled:opacity-60"
              >
                {checkoutLoading ? "…" : labels.checkout}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
