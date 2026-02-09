import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const locales = ["en", "fr"] as const;
const defaultLocale = "en";

// In-memory rate limit store (per Edge instance). Use Upstash Redis for multi-instance limits.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_ENTRIES = 20_000; // cap memory

type RateLimitEntry = { path: string; timestamps: number[] };

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function pruneStale(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

function isRateLimited(
  ip: string,
  path: string,
  limit: number,
  store: Map<string, RateLimitEntry>
): boolean {
  const key = `${ip}:${path}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    if (store.size >= MAX_ENTRIES) {
      // Evict oldest keys by clearing a portion (simple strategy)
      const keysToDelete = [...store.keys()].slice(0, Math.floor(MAX_ENTRIES / 4));
      keysToDelete.forEach((k) => store.delete(k));
    }
    entry = { path, timestamps: [now] };
    store.set(key, entry);
    return false;
  }

  entry.timestamps = pruneStale(entry.timestamps, RATE_LIMIT_WINDOW_MS);
  entry.timestamps.push(now);
  return entry.timestamps.length > limit;
}

// Global store for Edge (shared within same isolate)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limits: [path pattern, request limit per minute]
const RATE_LIMITS: { path: string; limit: number; method?: string }[] = [
  { path: "/api/checkout", limit: 15, method: "POST" },
  { path: "/api/track-order", limit: 60, method: "GET" },
  { path: "/en/account/login", limit: 30 },
  { path: "/fr/account/login", limit: 30 },
  { path: "/en/account/sign-up", limit: 30 },
  { path: "/fr/account/sign-up", limit: 30 },
];

function checkRateLimit(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const ip = getClientIp(request);

  for (const { path, limit, method: allowedMethod } of RATE_LIMITS) {
    if (pathname !== path && !pathname.startsWith(path + "/")) continue;
    if (allowedMethod && method !== allowedMethod) continue;
    const key = pathname.startsWith("/api/") ? pathname : path;
    if (isRateLimited(ip, key, limit, rateLimitStore)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    break; // only one rule per request
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return supabaseResponse;
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirect.cookies.set(cookie.name, cookie.value)
    );
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
