/**
 * Central SEO config and helpers for Ciavaglia Timepieces.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://ciavagliatimepieces.com).
 */

const _siteUrlRaw =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ciavagliatimepieces.com";

/** Site origin only (no path). Prevents /en/en when SITE_URL was set with a path. */
export const SITE_URL = (() => {
  try {
    const u = new URL(_siteUrlRaw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return _siteUrlRaw.replace(/\/$/, "").replace(/\/(en|fr)(\/.*)?$/i, "") || _siteUrlRaw;
  }
})();

export const SITE_NAME = "Ciavaglia Timepieces";
export const DEFAULT_DESCRIPTION_EN =
  "Custom luxury timepieces and artisan watchmaking in Montreal. Design your own watch with our configurator or explore ready-to-ship collections.";
export const DEFAULT_DESCRIPTION_FR =
  "Montres de luxe sur mesure et horlogerie artisanale à Montréal. Concevez votre montre avec notre configurateur ou explorez les collections prêtes à expédier.";

export const LOCALE_DESCRIPTIONS: Record<string, string> = {
  en: DEFAULT_DESCRIPTION_EN,
  fr: DEFAULT_DESCRIPTION_FR,
};

export const TWITTER_HANDLE = ""; // e.g. @ciavagliatimepieces
export const FACEBOOK_APP_ID = "";

/** Build full canonical or alternate URL for a path (path should start with /). */
export function fullUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL.replace(/\/$/, "")}${p}`;
}

/** JSON-LD Organization (for all pages). */
export function organizationJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: fullUrl(`/${locale}`),
    logo: fullUrl("/images/logo.png"),
    description:
      locale === "fr" ? DEFAULT_DESCRIPTION_FR : DEFAULT_DESCRIPTION_EN,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montreal",
      addressCountry: "CA",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "ciavagliatimepieces@gmail.com",
      contactType: "customer service",
      availableLanguage: ["English", "French"],
    },
  };
}

/** JSON-LD WebSite with optional SearchAction (for home / layout). */
export function websiteJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: fullUrl(`/${locale}`),
    description:
      locale === "fr" ? DEFAULT_DESCRIPTION_FR : DEFAULT_DESCRIPTION_EN,
    inLanguage: locale === "fr" ? "fr-CA" : "en-CA",
    publisher: organizationJsonLd(locale),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: fullUrl(`/${locale}/shop?q={search_term_string}`),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumb list JSON-LD for shop/category pages. */
export function breadcrumbJsonLd(
  locale: string,
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: fullUrl(`/${locale}${item.path}`),
    })),
  };
}
