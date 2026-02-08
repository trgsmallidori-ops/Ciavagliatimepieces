/** Cookie name for user's preferred currency (USD | CAD). */
export const CURRENCY_COOKIE_NAME = "currency";

export type CurrencyCode = "USD" | "CAD";

export const CURRENCIES: CurrencyCode[] = ["USD", "CAD"];

/** Main/store currency: all product and configurator prices are stored in CAD. */
const DEFAULT_CURRENCY: CurrencyCode = "CAD";

/** Parse currency from cookie value. */
export function parseCurrency(value: string | undefined): CurrencyCode {
  if (value === "USD" || value === "CAD") return value;
  return DEFAULT_CURRENCY;
}

/** Get exchange rate USD → CAD (1 USD = X CAD). Uses env or fetches from API with cache. */
let cachedRate: number | null = null;
let cacheTime = 0;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdToCadRate(): Promise<number> {
  const envRate = process.env.EXCHANGE_RATE_USD_TO_CAD;
  if (envRate != null && envRate !== "") {
    const n = Number(envRate);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (cachedRate != null && Date.now() - cacheTime < CACHE_MS) {
    return cachedRate;
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = (await res.json()) as { rates?: { CAD?: number } };
    const rate = data?.rates?.CAD;
    if (rate != null && Number.isFinite(rate) && rate > 0) {
      cachedRate = rate;
      cacheTime = Date.now();
      return rate;
    }
  } catch {
    // ignore
  }
  // Fallback
  const fallback = 1.36;
  cachedRate = fallback;
  cacheTime = Date.now();
  return fallback;
}

/** Format a price for display. Amount is always in CAD (store currency). USD uses rate to convert. */
export function formatPrice(
  amountCad: number,
  currency: CurrencyCode,
  usdToCad: number
): string {
  if (currency === "CAD") {
    return `C$${amountCad.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const amountUsd = amountCad / usdToCad;
  return `$${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
