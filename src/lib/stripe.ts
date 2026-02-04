import Stripe from "stripe";

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(apiKey, {
    apiVersion: "2026-01-28.clover",
  });
}

/** Base URL for the site (origin only, no path). Used for Stripe redirects so locale is not doubled (e.g. /en/en). */
export function getSiteUrl() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const normalized = url.replace(/\/$/, "");
  try {
    const parsed = new URL(normalized);
    return parsed.origin;
  } catch {
    const parts = normalized.split("/");
    return parts.slice(0, 3).join("/") || normalized;
  }
}
