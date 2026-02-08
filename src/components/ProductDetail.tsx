"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCurrency } from "@/components/CurrencyContext";
import { createBrowserClient } from "@/lib/supabase/client";
import { addGuestCartItem } from "@/lib/guest-cart";

type ProductDetailProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    specifications: string | null;
    price: number;
    original_price?: number | null;
    image: string | null;
    stock: number;
    category: string | null;
  };
  images: { id: string; url: string; sort_order: number }[];
  locale: string;
  categoryLabel?: string;
};

export default function ProductDetail({ product, images, locale, categoryLabel }: ProductDetailProps) {
  const pathname = usePathname();
  const { currency, formatPrice } = useCurrency();
  const activeLocale = locale || pathname?.split("/").filter(Boolean)[0] || "en";
  const isFr = activeLocale === "fr";
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const openLightbox = () => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  };
  const handleLightboxWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setLightboxZoom((z) => Math.min(4, Math.max(0.5, z + (e.deltaY > 0 ? -0.2 : 0.2))));
  };
  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y });
  };
  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setLightboxPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handleLightboxMouseUp = () => setIsPanning(false);
  const handleLightboxBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLightbox();
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const mainImage = product.image ?? "/images/hero-1.svg";
  const allImages = [mainImage, ...images.map((i) => i.url)];
  const displayImage = allImages[selectedIndex] ?? mainImage;
  const isExternal = displayImage.startsWith("http");
  const specLines = (product.specifications ?? "").trim().split(/\r?\n/).filter(Boolean);
  const outOfStock = (product.stock ?? 0) < 1;

  const handleAddToCart = async () => {
    if (outOfStock) return;
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        addGuestCartItem({
          product_id: product.id,
          quantity: 1,
          price: product.price,
          title: product.name,
          image_url: mainImage,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
        window.dispatchEvent(new CustomEvent("cart-item-added"));
        return;
      }

      const { data: existing } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();
      const newQty = (existing?.quantity ?? 0) + 1;

      await supabase.from("cart_items").upsert({
        user_id: user.id,
        product_id: product.id,
        quantity: newQty,
        price: product.price,
        title: product.name,
        image_url: mainImage,
      });
      window.dispatchEvent(new CustomEvent("cart-updated"));
      window.dispatchEvent(new CustomEvent("cart-item-added"));
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (outOfStock) return;
    setLoading(true);
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
          productId: product.id,
          userId: user?.id ?? null,
          currency,
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
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-8 text-sm text-white/80">
        <Link href={`/${activeLocale}/shop`} className="hover:text-white">
          {isFr ? "Boutique" : "Shop"}
        </Link>
        {categoryLabel && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/${activeLocale}/shop/${product.category ?? ""}`} className="hover:text-white">
              {categoryLabel}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-white">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <button
            type="button"
            onClick={openLightbox}
            className="relative block aspect-square w-full overflow-hidden rounded-[var(--radius-xl)] border border-foreground/10 bg-white/70 shadow-[var(--shadow)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized={isExternal && !displayImage.includes("supabase")}
              priority
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm">
              {isFr ? "Cliquez pour agrandir" : "Click to enlarge"}
            </span>
          </button>
          {allImages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {allImages.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    selectedIndex === i ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-foreground/20 hover:border-foreground/40"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized={url.startsWith("http") && !url.includes("supabase")}
                  />
                </button>
              ))}
            </div>
          )}

          {lightboxOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
              onClick={handleLightboxBackdropClick}
              onWheel={handleLightboxWheel}
              onMouseDown={handleLightboxMouseDown}
              onMouseMove={handleLightboxMouseMove}
              onMouseUp={handleLightboxMouseUp}
              onMouseLeave={handleLightboxMouseUp}
              role="dialog"
              aria-modal="true"
              aria-label={isFr ? "Image agrandie" : "Enlarged image"}
            >
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label={isFr ? "Fermer" : "Close"}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.min(4, z + 0.5)); }}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxZoom((z) => Math.max(0.5, z - 0.5)); }}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
                >
                  −
                </button>
                <span className="flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                  {Math.round(lightboxZoom * 100)}%
                </span>
              </div>
              <div
                className="flex max-h-[90vh] max-w-[90vw] items-center justify-center overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="origin-center select-none"
                  style={{
                    transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                    cursor: lightboxZoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
                  }}
                  onMouseDown={lightboxZoom > 1 ? handleLightboxMouseDown : undefined}
                >
                  <Image
                    src={displayImage}
                    alt={product.name}
                    width={1200}
                    height={1200}
                    className="max-h-[90vh] w-auto max-w-[90vw] object-contain"
                    draggable={false}
                    unoptimized={isExternal && !displayImage.includes("supabase")}
                  />
                </div>
              </div>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-sm text-white/60">
                {isFr ? "Molette pour zoomer · Glisser pour déplacer · Clic dehors pour fermer" : "Scroll to zoom · Drag to pan · Click outside to close"}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            {product.original_price != null && product.original_price > product.price ? (
              <>
                <span className="rounded bg-red-600/90 px-2.5 py-1 text-sm font-medium text-white">
                  {isFr ? "Réduction" : "Discount"} {Math.round((1 - product.price / product.original_price) * 100)}%
                </span>
                <span className="text-xl font-medium text-white/60 line-through">{formatPrice(Number(product.original_price))}</span>
                <span className="text-2xl font-semibold text-[var(--logo-gold)]">{formatPrice(Number(product.price))}</span>
              </>
            ) : (
              <p className="text-2xl font-semibold text-[var(--logo-gold)]">{formatPrice(Number(product.price))}</p>
            )}
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-white/70">
                {isFr ? "Description" : "Description"}
              </h2>
              <p className="mt-2 whitespace-pre-line text-white/90">{product.description}</p>
            </div>
          )}

          {specLines.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-white/70">
                {isFr ? "Spécifications" : "Specifications"}
              </h2>
              <ul className="mt-2 list-inside list-disc space-y-1 text-white/90">
                {specLines.map((line, i) => (
                  <li key={i}>{line.trim()}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {outOfStock ? (
              <span className="rounded-full border border-white/40 px-6 py-3 text-sm uppercase tracking-wider text-white/60">
                {isFr ? "Rupture de stock" : "Out of stock"}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="btn-hover rounded-full border border-white/40 px-6 py-3 text-sm uppercase tracking-[0.2em] text-white transition hover:border-white hover:bg-white/10 disabled:opacity-60"
                >
                  {isFr ? "Ajouter au panier" : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={loading}
                  className="btn-hover rounded-full bg-[var(--logo-gold)] px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--logo-green)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {isFr ? "Acheter maintenant" : "Buy now"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
