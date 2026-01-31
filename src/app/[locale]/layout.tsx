import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import { getDictionary, Locale, locales } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Civaglia Timepieces",
  description: "Bespoke watchmaking studio.",
};

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

  return (
    <div className="min-h-screen">
      <NavBar locale={locale} labels={dictionary.nav} />
      <main className="pt-28">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
