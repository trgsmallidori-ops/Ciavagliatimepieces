"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { createBrowserClient } from "@/lib/supabase/client";
import { addGuestCartItem } from "@/lib/guest-cart";

type Watch = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number | null;
  image: string;
  stock?: number;
};

export default function ShopGrid({ watches, locale }: { watches: Watch[]; locale: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pathname = usePathname();
  const activeLocale = locale || pathname.split("/").filter(Boolean)[0] || "en";
  const isFr = activeLocale === "fr";

  const handleAddToCart = async (watch: Watch) => {
    if ((watch.stock ?? 1) < 1) return;
    setLoadingId(watch.id);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        addGuestCartItem({
          product_id: watch.id,
          quantity: 1,
          price: watch.price,
          title: watch.name,
          image_url: watch.image,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
        window.dispatchEvent(new CustomEvent("cart-item-added"));
        return;
      }

      const { data: existing } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("product_id", watch.id)
        .maybeSingle();
      const newQty = (existing?.quantity ?? 0) + 1;

      await supabase.from("cart_items").upsert({
        user_id: user.id,
        product_id: watch.id,
        quantity: newQty,
        price: watch.price,
        title: watch.name,
        image_url: watch.image,
      });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      window.dispatchEvent(new CustomEvent("cart-item-added"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleBuyNow = async (watch: Watch) => {
    if ((watch.stock ?? 1) < 1) return;
    setLoadingId(watch.id);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: activeLocale,
          type: "built",
          productId: watch.id,
          userId: user?.id ?? null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      const message =
        typeof data?.error === "string"
          ? data.error
          : isFr ? "Impossible de lancer la commande. Réessayez." : "Could not start checkout. Please try again.";
      alert(message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {watches.map((watch) => (
        <ScrollReveal key={watch.id}>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <Link
              href={`/${activeLocale}/shop/product/${watch.id}`}
              className="block focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-[22px]"
            >
              <Image
                src={watch.image}
                alt={watch.name}
                width={420}
                height={420}
                className="h-60 w-full rounded-[22px] object-cover"
              />
              <h3 className="mt-6 text-2xl hover:underline">{watch.name}</h3>
            </Link>
            <p className="mt-2 line-clamp-2 text-sm text-foreground/70">{watch.description}</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              {watch.original_price != null && watch.original_price > watch.price ? (
                <>
                  <span className="rounded bg-red-600/90 px-2 py-0.5 text-xs font-medium text-white">
                    {isFr ? "Réduction" : "Discount"} {Math.round((1 - watch.price / watch.original_price) * 100)}%
                  </span>
                  <span className="text-lg font-semibold text-foreground/70 line-through">${watch.original_price.toLocaleString()}</span>
                  <span className="text-lg font-semibold text-[var(--accent)]">${watch.price.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-lg font-semibold">${watch.price.toLocaleString()}</span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {(watch.stock ?? 1) < 1 ? (
                <span className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-foreground/50">
                  {isFr ? "Rupture de stock" : "Out of stock"}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(watch)}
                    className="btn-hover rounded-full border border-foreground/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-foreground/70 disabled:pointer-events-none disabled:opacity-60"
                    disabled={loadingId === watch.id}
                  >
                    {isFr ? "Ajouter" : "Add to cart"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuyNow(watch)}
                    className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.3em] text-white disabled:pointer-events-none disabled:opacity-60"
                    disabled={loadingId === watch.id}
                  >
                    {isFr ? "Acheter" : "Buy now"}
                  </button>
                </>
              )}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
