import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CartToast from "@/components/CartToast";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import { isAdmin } from "@/lib/admin";
import { getDictionary, Locale, locales } from "@/lib/i18n";
import { createAuthServerClient } from "@/lib/supabase/server";
import { getWatchCategories } from "@/lib/watch-categories";

export const metadata: Metadata = {
  title: "Ciavaglia Timepieces",
  description: "Custom watchmaking studio.",
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
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdminUser = isAdmin(user?.id);
  const watchCategories = await getWatchCategories();

  return (
    <div className="min-h-screen">
      <NavBar locale={locale} labels={dictionary.nav} isAdmin={isAdminUser} watchCategories={watchCategories} />
      <main className="pt-28">{children}</main>
      <Footer locale={locale} />
      <CartToast locale={locale} />
    </div>
  );
}
