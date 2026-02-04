"use client";

import { useEffect, useState } from "react";

export default function CartToast({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const isFr = locale === "fr";

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handler = () => {
      setVisible(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setVisible(false), 2500);
    };
    window.addEventListener("cart-item-added", handler);
    return () => {
      window.removeEventListener("cart-item-added", handler);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full border border-foreground/15 bg-white px-4 py-3 shadow-lg ring-1 ring-foreground/10"
    >
      <svg
        className="h-5 w-5 shrink-0 text-accent"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium text-foreground">
        {isFr ? "Ajouté au panier" : "Added to cart"}
      </span>
    </div>
  );
}
