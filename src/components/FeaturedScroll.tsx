"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type FeaturedSlide = {
  id: string;
  image_url: string;
  image_url_secondary: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  link_url: string | null;
  sort_order: number;
};

const WELCOME_EN = "Welcome to Ciavaglia Timepieces";
const WELCOME_FR = "Bienvenue chez Ciavaglia Timepieces";
const CONTINUE_EN = "Continue";
const CONTINUE_FR = "Continuer";

/** Scroll distance per slide */
const VH_PER_SLIDE = 120;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function FeaturedScroll({
  slides,
  locale,
  fallbackImage,
  jumpLabel,
  jumpHref,
  purchaseLabel,
}: {
  slides: FeaturedSlide[];
  locale: string;
  fallbackImage: string;
  jumpLabel: string;
  jumpHref?: string;
  purchaseLabel: string;
}) {
  const items =
    slides.length > 0
      ? slides
      : [
          {
            id: "fallback",
            image_url: fallbackImage,
            image_url_secondary: null,
            title: null,
            subtitle: null,
            description: null,
            link_url: null,
            sort_order: 0,
          },
        ];

  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [useMotion, setUseMotion] = useState(true);
  /** On mobile/touch we use simple stacked scroll to avoid sticky + transform jank. Default true to avoid flash of janky animation on mobile. */
  const [isMobileOrTouch, setIsMobileOrTouch] = useState(true);
  const rafId = useRef<number | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setUseMotion(false);
      return;
    }
    const touchOrNarrow = () => {
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const narrow = window.innerWidth < 768;
      setIsMobileOrTouch(touch && narrow);
    };
    touchOrNarrow();
    window.addEventListener("resize", touchOrNarrow);
    return () => window.removeEventListener("resize", touchOrNarrow);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !useMotion || isMobileOrTouch) return;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const range = vh * (VH_PER_SLIDE / 100);
      const raw = rect.top <= 0 ? Math.min(items.length, -rect.top / range) : 0;
      progressRef.current = raw;
      setScrollProgress(raw);
      rafId.current = null;
    };

    const onScrollOrResize = () => {
      if (rafId.current != null) return;
      rafId.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [useMotion, isMobileOrTouch, items.length]);

  const jumpUrl = jumpHref ?? "#watch-collections";

  const useSimpleStack = !useMotion || isMobileOrTouch;

  if (useSimpleStack) {
    return (
      <section className="-mt-28 md:-mt-32 w-full bg-[var(--background)] text-foreground" aria-label="Featured">
        {items.map((slide, index) => (
          <div key={slide.id} className="relative h-[100vh] w-full overflow-hidden">
            <FeaturedSlideLayer
              primarySrc={slide.image_url || fallbackImage}
              alt={slide.title || ""}
              priority={index === 0}
              subtitle={slide.subtitle}
              title={slide.title}
              description={slide.description}
              jumpLabel={jumpLabel}
              jumpUrl={jumpUrl}
              purchaseLabel={purchaseLabel}
              purchaseUrl={resolvePurchaseUrl(slide.link_url, locale)}
              showWelcome={index === 0}
              locale={locale}
              slideIndex={index}
              scrollProgress={1}
              totalSlides={items.length}
            />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="-mt-28 md:-mt-32 w-full bg-[var(--background)] text-foreground"
      style={{ height: `${items.length * VH_PER_SLIDE}vh` }}
      aria-label="Featured"
    >
      {/* Scroll indicator – right edge */}
      <div
        className="pointer-events-none fixed right-4 top-1/2 z-[100] hidden -translate-y-1/2 md:block"
        aria-hidden
      >
        <div
          className="h-24 w-px border-r-2 border-dashed border-white/40"
          style={{ opacity: 0.6 }}
        />
      </div>

      <div className="sticky top-0 h-[100vh] w-full overflow-hidden">
        {items.map((slide, index) => (
          <FeaturedSlideLayer
            key={slide.id}
            primarySrc={slide.image_url || fallbackImage}
            alt={slide.title || ""}
            priority={index === 0}
            subtitle={slide.subtitle}
            title={slide.title}
            description={slide.description}
            jumpLabel={jumpLabel}
            jumpUrl={jumpUrl}
            purchaseLabel={purchaseLabel}
            purchaseUrl={resolvePurchaseUrl(slide.link_url, locale)}
            showWelcome={index === 0}
            locale={locale}
            slideIndex={index}
            scrollProgress={scrollProgress}
            totalSlides={items.length}
          />
        ))}
      </div>
    </section>
  );
}

function resolvePurchaseUrl(link_url: string | null, locale: string): string | null {
  if (!link_url) return null;
  if (link_url.startsWith("http")) return link_url;
  return `/${locale}${link_url.startsWith("/") ? link_url : `/${link_url}`}`;
}

function FeaturedSlideLayer({
  primarySrc,
  alt,
  priority,
  subtitle,
  title,
  description,
  jumpLabel,
  jumpUrl,
  purchaseLabel,
  purchaseUrl,
  showWelcome,
  locale,
  slideIndex,
  scrollProgress,
  totalSlides,
}: {
  primarySrc: string;
  alt: string;
  priority: boolean;
  subtitle: string | null;
  title: string | null;
  description: string | null;
  jumpLabel: string;
  jumpUrl: string;
  purchaseLabel: string;
  purchaseUrl: string | null;
  showWelcome: boolean;
  locale: string;
  slideIndex: number;
  scrollProgress: number;
  totalSlides: number;
}) {
  const currentIndex = Math.min(Math.floor(scrollProgress), totalSlides - 1);
  const isCurrentSlide = currentIndex === slideIndex;
  const localProgress = Math.max(0, Math.min(1, scrollProgress - slideIndex));
  const ease = easeOutCubic(localProgress);

  let slideY: number;
  if (slideIndex < currentIndex) slideY = -100;
  else if (slideIndex > currentIndex + 1) slideY = 100;
  else if (slideIndex === currentIndex) slideY = -100 * ease;
  else slideY = 0;

  const isInteractive = isCurrentSlide || (scrollProgress >= slideIndex && scrollProgress < slideIndex + 1);

  const continueLabel = locale === "fr" ? CONTINUE_FR : CONTINUE_EN;

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: isCurrentSlide ? totalSlides : slideIndex,
        transform: `translate3d(0, ${slideY}%, 0)`,
        ...(isCurrentSlide || slideIndex === currentIndex + 1 ? { willChange: "transform" as const } : {}),
        pointerEvents: isInteractive ? "auto" : "none",
      }}
    >
      <div className="relative w-full h-full">
        {/* Full-bleed background image – fills entire slide */}
        <div className="pointer-events-none absolute inset-0 bg-neutral-900">
          <Image
            src={primarySrc}
            alt={alt}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={priority}
            unoptimized={primarySrc.startsWith("http") && !primarySrc.includes("supabase")}
          />
        </div>

        {/* Subtle dark overlay for text readability – no pointer events so buttons stay clickable */}
        <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden />

        {/* Text overlay – centered on top of image */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-24 text-center text-white">
          {showWelcome && (
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/95 drop-shadow-md">
              {locale === "fr" ? WELCOME_FR : WELCOME_EN}
            </p>
          )}
          {!showWelcome && subtitle && (
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/95 drop-shadow-md">{subtitle}</p>
          )}
          {title && (
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight drop-shadow-lg md:text-4xl lg:text-5xl xl:text-6xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/95 drop-shadow md:text-lg">
              {description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {purchaseUrl ? (
              <Link
                href={purchaseUrl}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-foreground transition hover:bg-white"
              >
                {continueLabel}
                <span aria-hidden>&rarr;</span>
              </Link>
            ) : (
              <a
                href={jumpUrl}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-foreground transition hover:bg-white"
              >
                {jumpLabel}
                <span aria-hidden>&rarr;</span>
              </a>
            )}
            {purchaseUrl && (
              <a
                href={jumpUrl}
                className="inline-flex items-center rounded-full border-2 border-white/80 px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
              >
                {jumpLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
