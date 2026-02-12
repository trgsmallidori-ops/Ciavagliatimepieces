import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import CartToast from "@/components/CartToast";
import CurrencyProvider from "@/components/CurrencyContext";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import { isAdmin } from "@/lib/admin";
import { parseCurrency, CURRENCY_COOKIE_NAME } from "@/lib/currency";
import { getDictionary, Locale, locales } from "@/lib/i18n";
import { createAuthServerClient } from "@/lib/supabase/server";
import { getWatchCategories } from "@/lib/watch-categories";
import {
  SITE_NAME,
  fullUrl,
  LOCALE_DESCRIPTIONS,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { getFooterSettings } from "@/app/[locale]/account/admin/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const desc = LOCALE_DESCRIPTIONS[locale] ?? LOCALE_DESCRIPTIONS.en;
  const canonical = fullUrl(`/${locale}`);
  const isFr = locale === "fr";

  return {
    title: isFr
      ? "Montres de luxe sur mesure | Configurateur | Montréal"
      : "Custom Luxury Watches | Watch Configurator | Montreal",
    description: desc,
    openGraph: {
      title: `${SITE_NAME} | ${isFr ? "Montres sur mesure Montréal" : "Custom Watches Montreal"}`,
      description: desc,
      url: canonical,
      locale: isFr ? "fr_CA" : "en_CA",
      alternateLocale: isFr ? ["en_CA"] : ["fr_CA"],
    },
    alternates: {
      canonical,
      languages: {
        "en-CA": fullUrl("/en"),
        "fr-CA": fullUrl("/fr"),
      },
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdminUser = isAdmin(user?.id);
  const watchCategories = await getWatchCategories();
  const cookieStore = await cookies();
  const currency = parseCurrency(cookieStore.get(CURRENCY_COOKIE_NAME)?.value);

  const orgJson = organizationJsonLd(locale);
  const webJson = websiteJsonLd(locale);
  const footer = await getFooterSettings();

  return (
    <div className="min-h-screen bg-[var(--logo-green)]">
      <CurrencyProvider initialCurrency={currency} initialUsdToCad={null}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgJson),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webJson),
        }}
      />
      <NavBar locale={locale} labels={dictionary.nav} isAdmin={isAdminUser} watchCategories={watchCategories} />
      <main className="pt-28 md:pt-32 bg-[var(--logo-green)] text-white" id="main-content">{children}</main>
      <Footer locale={locale} footer={footer} />
      <CartToast locale={locale} />
      </CurrencyProvider>
    </div>
  );
}
