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

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
