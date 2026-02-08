"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  type CurrencyCode,
  CURRENCY_COOKIE_NAME,
  parseCurrency,
  formatPrice as formatPriceLib,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  usdToCad: number | null;
  /** Format price for display. Pass amount in CAD (store currency). */
  formatPrice: (amountCad: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  initialUsdToCad,
  children,
}: {
  initialCurrency: CurrencyCode;
  initialUsdToCad: number | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);
  const [usdToCad, setUsdToCad] = useState<number | null>(initialUsdToCad);

  useEffect(() => {
    if (currency !== "USD") return;
    if (initialUsdToCad != null) {
      setUsdToCad(initialUsdToCad);
      return;
    }
    let cancelled = false;
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((data: { usdToCad?: number }) => {
        if (!cancelled && typeof data?.usdToCad === "number" && data.usdToCad > 0) {
          setUsdToCad(data.usdToCad);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currency, initialUsdToCad]);

  const setCurrency = useCallback(
    (c: CurrencyCode) => {
      setCurrencyState(c);
      document.cookie = `${CURRENCY_COOKIE_NAME}=${c};path=/;max-age=31536000;SameSite=Lax`;
      router.refresh();
    },
    [router]
  );

  const formatPrice = useCallback(
    (amountCad: number) => {
      const rate = currency === "USD" ? (usdToCad ?? 1.36) : 1.36;
      return formatPriceLib(amountCad, currency, rate);
    },
    [currency, usdToCad]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, usdToCad, formatPrice }),
    [currency, setCurrency, usdToCad, formatPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

export default CurrencyProvider;
