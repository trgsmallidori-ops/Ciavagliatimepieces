import type { Metadata } from "next";
import ShopGrid from "@/components/ShopGrid";
import ScrollReveal from "@/components/ScrollReveal";
import { createServerClient } from "@/lib/supabase/server";
import { getWatchCategories } from "@/lib/watch-categories";
import { Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const categories = await getWatchCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return { title: "Shop" };
  const label = locale === "fr" ? cat.label_fr : cat.label_en;
  const isFr = locale === "fr";
  return {
    title: isFr ? `${label} | Boutique` : `${label} | Shop`,
    description: isFr
      ? `Montres ${label} prêtes à expédier. Collection Ciavaglia Timepieces.`
      : `${label} watches ready to ship. Ciavaglia Timepieces collection.`,
    openGraph: {
      title: `${label} | Ciavaglia Timepieces`,
    },
  };
}

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ locale: Locale; category: string }>;
}) {
  const { locale, category } = await params;
  const categories = await getWatchCategories();
  const styleCategory = categories.find((c) => c.slug === category);
  if (!styleCategory) notFound();

  const label = locale === "fr" ? styleCategory.label_fr : styleCategory.label_en;
  const isFr = locale === "fr";

  const supabase = createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, original_price, image, stock")
    .eq("active", true)
    .eq("category", category)
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
              {isFr ? "Collection" : "Collection"}
            </p>
            <h1 className="mt-4 text-4xl text-white">{label ?? category}</h1>
            <p className="mt-4 text-white/80">
              {isFr
                ? "Pieces de cette ligne, pretes a expedier."
                : "Pieces in this line, ready to ship."}
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          {watches.length === 0 ? (
            <p className="rounded-[28px] border border-white/70 bg-white/80 p-10 text-center text-foreground text-foreground/70">
              {isFr ? "Aucune piece dans cette collection pour le moment." : "No pieces in this collection yet."}
            </p>
          ) : (
            <ShopGrid watches={watches} locale={locale} />
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
