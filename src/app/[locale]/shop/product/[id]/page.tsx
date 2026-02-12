import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getWatchCategories } from "@/lib/watch-categories";
import { getProductAddonsWithOptions, getProductBracelets } from "@/app/[locale]/account/admin/actions";
import ProductDetail from "@/components/ProductDetail";
import type { Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = createServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();
  if (!product) return { title: "Product" };
  const row = product as Record<string, unknown>;
  const name = (row.name as string) ?? "Watch";
  const description = row.description as string | null | undefined;
  const isFr = locale === "fr";
  return {
    title: isFr ? `${name} | Boutique` : `${name} | Shop`,
    description: description ?? (isFr ? `Montre ${name}. Ciavaglia Timepieces.` : `${name} watch. Ciavaglia Timepieces.`),
    openGraph: {
      title: `${name} | Ciavaglia Timepieces`,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = createServerClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (productError || !product) notFound();

  const [{ data: productImages }, addonsWithOptions, bracelets] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, url, sort_order")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    getProductAddonsWithOptions(id),
    getProductBracelets(id),
  ]);

  const categories = await getWatchCategories();
  const row = product as Record<string, unknown>;
  const categorySlug = row.category as string | null | undefined;
  const categoryLabel = categorySlug
    ? (locale === "fr"
        ? categories.find((c) => c.slug === categorySlug)?.label_fr
        : categories.find((c) => c.slug === categorySlug)?.label_en) ?? categorySlug
    : undefined;

  const productData = {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null | undefined) ?? null,
    specifications: (row.specifications as string | null | undefined) ?? null,
    price: Number(row.price),
    original_price: row.original_price != null ? Number(row.original_price) : null,
    image: (row.image as string | null | undefined) ?? null,
    stock: Number(row.stock ?? 0),
    category: (row.category as string | null | undefined) ?? null,
  };

  const images = (productImages ?? []).map((row) => ({
    id: (row as { id: string }).id,
    url: (row as { url: string }).url,
    sort_order: Number((row as { sort_order?: number }).sort_order ?? 0),
  }));

  const addons = addonsWithOptions ?? [];

  return (
    <ProductDetail
      product={productData}
      images={images}
      addons={addons}
      bracelets={bracelets ?? []}
      locale={locale}
      categoryLabel={categoryLabel}
    />
  );
}
