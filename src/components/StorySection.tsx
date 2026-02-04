"use client";

import { ReactNode, useEffect, useRef } from "react";

type StorySectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Optional full-bleed background image URL */
  image?: string | null;
  /** Overlay darkness 0–1 */
  overlay?: number;
  /** Min height (e.g. "100vh") */
  minHeight?: string;
  /** Content alignment */
  contentCenter?: boolean;
};

export default function StorySection({
  children,
  id,
  className = "",
  image,
  overlay = 0.35,
  minHeight = "100vh",
  contentCenter = true,
}: StorySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      content.classList.add("story-visible");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => content.classList.toggle("story-visible", entry.isIntersecting),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const bg = bgRef.current;
    if (!image || !section || !bg) return;
    let raf = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const offset = (center - viewportCenter) * 0.08;
      (bg as HTMLDivElement).style.transform = `translate3d(0, ${offset}px, 0) scale(1.05)`;
      raf = 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [image]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`story-section relative w-full overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      {image && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div
            ref={bgRef}
            className="story-bg absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-150 ease-out"
            style={{
              backgroundImage: `url(${image})`,
              willChange: "transform",
            }}
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlay }}
            aria-hidden
          />
        </div>
      )}
      <div
        ref={contentRef}
        className={`story-content relative z-10 ${contentCenter ? "flex min-h-full flex-col items-center justify-center px-6 py-20 text-center" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
