"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export type FeaturedSlide = { id: string; image_url: string; link_url: string | null; sort_order: number };

const AUTO_ADVANCE_MS = 6000;

export default function HeroCarousel({
  slides,
  locale,
  title,
  subtitle,
  trustLine,
  ctaPrimary,
  ctaSecondary,
  purchaseLabel,
  fallbackImage,
}: {
  slides: FeaturedSlide[];
  locale: string;
  title: string;
  subtitle: string;
  trustLine: string;
  ctaPrimary: string;
  ctaSecondary: string;
  purchaseLabel: string;
  fallbackImage: string;
}) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const items = slides.length > 0 ? slides : [{ id: "fallback", image_url: fallbackImage, link_url: null, sort_order: 0 }];
  const current = items[index];
  const hasMultiple = items.length > 1;

  const goTo = useCallback(
    (next: number) => {
      setIndex((i) => (i + next + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMultiple || !mounted) return;
    const t = setInterval(() => goTo(1), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [hasMultiple, mounted, goTo]);

  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden bg-[var(--background)] -mt-28 pt-28">
      {/* Full-screen background image(s) */}
      <div className="absolute inset-0">
        {items.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
              unoptimized={slide.image_url.startsWith("http") && !slide.image_url.includes("supabase")}
            />
            <div className="absolute inset-0 bg-black/30" aria-hidden />
          </div>
        ))}
      </div>

      {/* Content overlay – centered */}
      <div className="relative z-10 flex min-h-[100vh] flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-white/80">{locale === "fr" ? "Sur mesure" : "Custom"}</p>
        <h1 className="mt-4 text-4xl font-medium leading-tight text-white drop-shadow-md md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/90 drop-shadow">{subtitle}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/70">{trustLine}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href={`/${locale}/configurator`}
            className="btn-hover rounded-full bg-white px-6 py-3 text-sm font-medium uppercase tracking-[0.3em] text-foreground transition hover:bg-white/95"
          >
            {ctaPrimary}
          </Link>
          <Link
            href={`/${locale}/shop`}
            className="btn-hover rounded-full border-2 border-white/80 px-6 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white/10"
          >
            {ctaSecondary}
          </Link>
          {current.link_url && (
            <Link
              href={current.link_url.startsWith("http") ? current.link_url : `/${locale}${current.link_url.startsWith("/") ? current.link_url : `/${current.link_url}`}`}
              className="btn-hover rounded-full bg-foreground px-6 py-3 text-sm font-medium uppercase tracking-[0.3em] text-white transition hover:bg-foreground/90"
            >
              {purchaseLabel}
            </Link>
          )}
        </div>

        {/* Manual prev/next when multiple slides */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(-1)}
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 md:left-6"
              aria-label={locale === "fr" ? "Précédent" : "Previous"}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 md:right-6"
              aria-label={locale === "fr" ? "Suivant" : "Next"}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2" aria-hidden>
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                  }`}
                  aria-label={`${locale === "fr" ? "Slide" : "Slide"} ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
