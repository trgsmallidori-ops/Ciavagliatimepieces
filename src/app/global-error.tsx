"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 p-8 font-sans antialiased">
        <div className="mx-auto max-w-xl rounded-2xl border-2 border-red-300 bg-red-50 p-10 text-center shadow-lg">
          <h1 className="text-2xl font-semibold text-red-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-red-800">
            We couldn&apos;t load this page. You can try again or go back to the home page.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="btn-hover rounded-full border-2 border-red-300 bg-white px-6 py-3 text-sm font-medium text-red-800 transition hover:bg-red-100"
            >
              Try again
            </button>
            <a
              href="/"
              className="btn-hover rounded-full bg-red-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-900"
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
