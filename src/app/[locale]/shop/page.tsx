import type { Metadata } from "next";
import { Suspense } from "react";
import ShopGrid from "@/components/ShopGrid";
import ShopSort from "@/components/ShopSort";
import ScrollReveal from "@/components/ScrollReveal";
import { createServerClient } from "@/lib/supabase/server";
import { Locale, getDictionary } from "@/lib/i18n";

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

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale } = await params;
  const { sort } = await searchParams;
  const isFr = locale === "fr";
  const dictionary = getDictionary(locale);
  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, original_price, image, stock")
    .eq("active", true)
    .order("created_at", { ascending: false });

  let watches = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price: Number(p.price),
    original_price: p.original_price != null ? Number(p.original_price) : null,
    image: p.image ?? "/images/hero-1.svg",
    stock: p.stock ?? 0,
  }));

  if (sort === "price_asc") {
    watches = [...watches].sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    watches = [...watches].sort((a, b) => b.price - a.price);
  }

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <ScrollReveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
            <Suspense fallback={<div className="h-10 w-32 rounded-md bg-white/10" />}>
              <ShopSort labels={dictionary.shop} />
            </Suspense>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <ShopGrid watches={watches} locale={locale} />
        </ScrollReveal>
      </div>
    </section>
  );
}
