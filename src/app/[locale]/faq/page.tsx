import type { Metadata } from "next";
import { createAuthServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getFaqSettings } from "@/app/[locale]/account/admin/actions";
import FaqPageContent from "@/components/FaqPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr ? "FAQ | Questions fréquentes" : "FAQ | Frequently Asked Questions",
    description: isFr
      ? "Délais de fabrication, livraison internationale, modifications après achat. Réponses aux questions courantes."
      : "Build times, international shipping, post-purchase changes. Answers to common questions.",
    openGraph: {
      title: isFr ? "FAQ | Ciavaglia Timepieces" : "FAQ | Ciavaglia Timepieces",
    },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [faq, supabase] = await Promise.all([getFaqSettings(), createAuthServerClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const isAdminUser = isAdmin(user?.id);

  return <FaqPageContent locale={locale} isAdmin={!!isAdminUser} faq={faq} />;
}
