"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en";
  const isFr = locale === "fr";

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-[28px] border-2 border-red-200 bg-red-50 p-10 text-center shadow-lg">
        <h1 className="text-2xl font-semibold text-red-900">
          {isFr ? "Une erreur s'est produite" : "Something went wrong"}
        </h1>
        <p className="mt-3 text-sm text-red-800">
          {isFr
            ? "Nous n'avons pas pu charger cette page. Vous pouvez réessayer ou retourner à l'accueil."
            : "We couldn't load this page. You can try again or return to the home page."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="btn-hover rounded-full border-2 border-red-300 bg-white px-6 py-3 text-sm font-medium text-red-800 transition hover:bg-red-100"
          >
            {isFr ? "Réessayer" : "Try again"}
          </button>
          <Link
            href={`/${locale}`}
            className="btn-hover rounded-full bg-red-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-900"
          >
            {isFr ? "Retour à l'accueil" : "Back to home"}
          </Link>
        </div>
      </div>
    </section>
  );
}
