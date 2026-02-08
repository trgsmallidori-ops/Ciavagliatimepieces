import type { Metadata } from "next";
import ShopGrid from "@/components/ShopGrid";
import ScrollReveal from "@/components/ScrollReveal";
import { createServerClient } from "@/lib/supabase/server";
import { Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr ? "Boutique | Montres prêtes à expédier" : "Shop | Ready-to-Ship Watches",
    description: isFr
      ? "Montres Ciavaglia prêtes à expédier. Pièces assemblées à Montréal, quantités limitées."
      : "Ciavaglia ready-to-ship watches. Built in Montreal, limited quantities.",
    openGraph: {
      title: isFr ? "Boutique | Ciavaglia Timepieces" : "Shop | Ciavaglia Timepieces",
    },
  };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const isFr = locale === "fr";
  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, original_price, image, stock")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const watches = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price: Number(p.price),
    original_price: p.original_price != null ? Number(p.original_price) : null,
    image: p.image ?? "/images/hero-1.svg",
    stock: p.stock ?? 0,
  }));

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <ScrollReveal>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              {isFr ? "Montres pretes" : "Built Watches"}
            </p>
            <h1 className="mt-4 text-4xl text-white">
              {isFr ? "Des pieces pretes a expedier." : "Ready-to-ship masterpieces."}
            </h1>
            <p className="mt-4 text-white/80">
              {isFr
                ? "Chaque piece est assemblee par Ciavaglia et disponible en quantite limitee."
                : "Each piece is built by Ciavaglia and available in limited quantities. Add to cart or checkout instantly."}
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <ShopGrid watches={watches} locale={locale} />
        </ScrollReveal>
      </div>
    </section>
  );
}
