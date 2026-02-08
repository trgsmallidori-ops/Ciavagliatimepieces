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

const SCROLL_RANGE_VH = 0.38; // morph + text over ~38% of viewport
const SECTION_HEIGHT_VH = 150; // section height so there's scroll room

export default function FeaturedScroll({
  slides,
  locale,
  fallbackImage,
  jumpLabel,
  purchaseLabel,
}: {
  slides: FeaturedSlide[];
  locale: string;
  fallbackImage: string;
  jumpLabel: string;
  purchaseLabel: string;
}) {
  const items =
    slides.length > 0
      ? slides
      : [
          {
            id: "fallback",
            image_url: fallbackImage,
            image_url_secondary: fallbackImage,
            title: null,
            subtitle: null,
            description: null,
            link_url: null,
            sort_order: 0,
          },
        ];

  return (
    <section className="-mt-28 md:-mt-32 w-full pt-28 md:pt-32 bg-[var(--background)] text-foreground">
      {items.map((slide, index) => {
        const primary = slide.image_url || fallbackImage;
        const secondary = slide.image_url_secondary || primary || fallbackImage;
        const purchaseUrl = slide.link_url
          ? slide.link_url.startsWith("http")
            ? slide.link_url
            : `/${locale}${slide.link_url.startsWith("/") ? slide.link_url : `/${slide.link_url}`}`
          : null;

        return (
          <FeaturedSlideMorph
            key={slide.id}
            primarySrc={primary}
            secondarySrc={secondary}
            alt={slide.title || ""}
            priority={index === 0}
            subtitle={slide.subtitle}
            title={slide.title}
            description={slide.description}
            jumpLabel={jumpLabel}
            purchaseLabel={purchaseLabel}
            purchaseUrl={purchaseUrl}
            showWelcome={index === 0}
            locale={locale}
            extendUnderNav={index === 0}
          />
        );
      })}
    </section>
  );
}

const WELCOME_EN = "Welcome to Ciavaglia Timepieces";
const WELCOME_FR = "Bienvenue chez Ciavaglia Timepieces";

function FeaturedSlideMorph({
  primarySrc,
  secondarySrc,
  alt,
  priority,
  subtitle,
  title,
  description,
  jumpLabel,
  purchaseLabel,
  purchaseUrl,
  showWelcome,
  locale,
  extendUnderNav,
}: {
  primarySrc: string;
  secondarySrc: string;
  alt: string;
  priority: boolean;
  subtitle: string | null;
  title: string | null;
  description: string | null;
  jumpLabel: string;
  purchaseLabel: string;
  purchaseUrl: string | null;
  showWelcome: boolean;
  locale: string;
  extendUnderNav?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    const update = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const range = vh * SCROLL_RANGE_VH;
      // progress 0 when section top is at or below viewport top; 1 when we've scrolled `range` into the section
      const raw = rect.top <= 0 ? Math.min(1, -rect.top / range) : 0;
      setProgress(raw);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Image crossfade: primary fades out, secondary fades in
  const primaryOpacity = 1 - progress;
  const secondaryOpacity = progress;
  // Text appears after ~20% scroll, fully in by ~70%
  const textEase = progress <= 0.2 ? 0 : Math.min(1, (progress - 0.2) / 0.5);
  const textOpacity = textEase;
  const textY = (1 - textEase) * 32;

  return (
    <div
      ref={sectionRef}
      className={`relative w-full overflow-hidden ${extendUnderNav ? "-mt-28 md:-mt-32 pt-28 md:pt-32" : ""}`}
      style={{ minHeight: `${SECTION_HEIGHT_VH}vh` }}
    >
      {/* First image */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: primaryOpacity }}
      >
        <Image
          src={primarySrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority={priority}
          unoptimized={primarySrc.startsWith("http") && !primarySrc.includes("supabase")}
        />
      </div>
      {/* Second image – morphs in */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: secondaryOpacity }}
      >
        <Image
          src={secondarySrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized={secondarySrc.startsWith("http") && !secondarySrc.includes("supabase")}
        />
      </div>
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      {/* Welcome overlay – top of first slide, fades out on scroll */}
      {showWelcome && (
        <div
          className="pointer-events-none absolute inset-x-0 top-[18%] z-10 flex justify-center px-6 transition-opacity duration-300"
          style={{ opacity: 1 - progress }}
          aria-hidden
        >
          <h1 className="text-center text-3xl font-medium tracking-wide text-white drop-shadow-lg md:text-4xl lg:text-5xl xl:text-6xl">
            {locale === "fr" ? WELCOME_FR : WELCOME_EN}
          </h1>
        </div>
      )}

      {/* Jump button – visible at top of section */}
      <div
        className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 transition-opacity duration-300"
        style={{ opacity: 1 - progress }}
      >
        <a
          href="#watch-collections"
          className="btn-hover inline-block rounded-full bg-white/95 px-8 py-3.5 text-xs uppercase tracking-[0.35em] text-foreground transition hover:bg-white"
        >
          {jumpLabel}
        </a>
      </div>

      {/* Text overlay – fades and slides up as you scroll */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-24 text-center text-white"
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.4em] text-white/85">{subtitle}</p>
        )}
        {title && (
          <h2 className="mt-4 text-4xl font-medium leading-tight drop-shadow-lg md:text-5xl lg:text-6xl xl:text-7xl">
            {title}
          </h2>
        )}
        {description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90 drop-shadow md:text-xl">
            {description}
          </p>
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="#watch-collections"
            className="btn-hover rounded-full bg-white px-8 py-3.5 text-xs uppercase tracking-[0.35em] text-foreground transition hover:bg-white/95"
          >
            {jumpLabel}
          </a>
          {purchaseUrl && (
            <Link
              href={purchaseUrl}
              className="btn-hover rounded-full border-2 border-white/90 px-8 py-3.5 text-xs uppercase tracking-[0.35em] text-white transition hover:border-white hover:bg-white/15"
            >
              {purchaseLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
