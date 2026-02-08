import type { Metadata } from "next";
import ShopGrid from "@/components/ShopGrid";
import ScrollReveal from "@/components/ScrollReveal";
import { createServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr ? "Spéciaux | Boutique" : "Specials | Shop",
    description: isFr
      ? "Montres en promotion. Ciavaglia Timepieces."
      : "Watches on sale. Ciavaglia Timepieces.",
    openGraph: {
      title: isFr ? "Spéciaux | Ciavaglia Timepieces" : "Specials | Ciavaglia Timepieces",
    },
  };
}

export default async function SpecialsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const isFr = locale === "fr";
  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, original_price, image, stock")
    .eq("active", true)
    .not("original_price", "is", null)
    .order("created_at", { ascending: false });

  const watches = (products ?? [])
    .filter((p) => p.original_price != null && Number(p.original_price) > Number(p.price))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: Number(p.price),
      original_price: Number(p.original_price),
      image: p.image ?? "/images/hero-1.svg",
      stock: p.stock ?? 0,
    }));

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <ScrollReveal>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              {isFr ? "Promotions" : "Promotions"}
            </p>
            <h1 className="mt-4 text-4xl text-white">
              {isFr ? "Spéciaux et réductions." : "Specials & discounts."}
            </h1>
            <p className="mt-4 text-white/80">
              {isFr
                ? "Pièces en promotion, prêtes à expédier."
                : "Pieces on sale, ready to ship."}
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          {watches.length === 0 ? (
            <p className="rounded-[28px] border border-white/70 bg-white/80 p-10 text-center text-foreground/70">
              {isFr ? "Aucune promotion pour le moment." : "No specials at the moment."}
            </p>
          ) : (
            <ShopGrid watches={watches} locale={locale} />
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
