import type { Metadata } from "next";
import Configurator from "@/components/Configurator";
import { Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr ? "Configurateur | Créez votre montre" : "Configurator | Design Your Watch",
    description: isFr
      ? "Configurez votre montre sur mesure : boîtier, cadran, aiguilles, bracelet. Prix en direct."
      : "Design your custom watch: case, dial, hands, strap. Live pricing and instant add-to-cart.",
    openGraph: {
      title: isFr ? "Configurateur | Ciavaglia Timepieces" : "Configurator | Ciavaglia Timepieces",
    },
  };
}

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale } = await params;
  const { edit: editCartItemId } = await searchParams;

  return (
    <section className="min-h-screen bg-[var(--logo-green)]">
      <Configurator locale={locale} editCartItemId={editCartItemId ?? undefined} />
    </section>
  );
}
