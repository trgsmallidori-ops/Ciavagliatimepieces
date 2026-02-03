"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  title: string | null;
  image_url: string | null;
};

type CartLabels = {
  title: string;
  empty: string;
  continueShopping: string;
  subtotal: string;
  checkout: string;
  remove: string;
  quantity: string;
};

export default function CartView({ locale, labels }: { locale: string; labels: CartLabels }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = locale || pathname.split("/").filter(Boolean)[0] || "en";
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, price, title, image_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data ?? []).map((r) => ({ ...r, price: Number(r.price), quantity: Number(r.quantity) })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    const supabase = createBrowserClient();
    await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const removeItem = async (itemId: string) => {
    const supabase = createBrowserClient();
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const handleCheckout = async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${activeLocale}/account/login`);
      return;
    }
    if (items.length === 0) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: activeLocale, type: "cart", userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
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
        <h1 className="text-3xl font-medium">{labels.title}</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[22px] border-2 border-foreground/15 bg-white/80 p-10 text-center">
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
                  className="flex flex-wrap items-center gap-4 rounded-[22px] border border-foreground/15 bg-white p-4 shadow-sm"
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
                    <p className="text-sm text-foreground/70">${Number(item.price).toLocaleString()} each</p>
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
                  <p className="w-20 text-right font-semibold">${(item.price * item.quantity).toLocaleString()}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="btn-hover rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                  >
                    {labels.remove}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-end gap-4 rounded-[22px] border-2 border-foreground/15 bg-white p-6">
              {error && <p className="w-full text-sm text-red-600">{error}</p>}
              <p className="text-lg font-semibold">
                {labels.subtotal}: ${subtotal.toLocaleString()}
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
