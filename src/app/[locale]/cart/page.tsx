import { redirect } from "next/navigation";
import CartView from "@/components/CartView";
import { getDictionary, Locale } from "@/lib/i18n";
import { createAuthServerClient } from "@/lib/supabase/server";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/account/login?redirect=${encodeURIComponent(`/${locale}/cart`)}`);
  }

  const dictionary = getDictionary(locale as Locale);
  const labels = dictionary.cart;

  return <CartView locale={locale} labels={labels} />;
}
