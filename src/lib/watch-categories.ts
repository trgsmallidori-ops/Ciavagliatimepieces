import { createServerClient } from "@/lib/supabase/server";
import { shopCategories } from "@/data/categories";

export type WatchCategory = {
  id: string;
  slug: string;
  label_en: string;
  label_fr: string;
  sort_order: number;
  image_url: string | null;
  display_price: number | null;
};

/** Static fallback when DB has no categories (e.g. migration not run). Same list as original nav. */
const FALLBACK_CATEGORIES: WatchCategory[] = shopCategories.map((c, i) => ({
  id: `fallback-${c.slug}`,
  slug: c.slug,
  label_en: c.labelEn,
  label_fr: c.labelFr,
  sort_order: i + 1,
  image_url: null,
  display_price: null,
}));

/** Nav-only category: always shown in navbar, never in homepage style blocks. Injected when not in DB. */
const WOMENS_NAV_CATEGORY: WatchCategory = {
  id: "nav-womens",
  slug: "womens",
  label_en: "Womens",
  label_fr: "Femmes",
  sort_order: 0,
  image_url: null,
  display_price: null,
};

function ensureWomensInNav(categories: WatchCategory[]): WatchCategory[] {
  if (categories.some((c) => c.slug === "womens")) return categories;
  return [WOMENS_NAV_CATEGORY, ...categories];
}

/** Server-only: fetch watch categories for nav and shop. Uses static list if DB empty or error. */
export async function getWatchCategories(): Promise<WatchCategory[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("watch_categories")
      .select("id, slug, label_en, label_fr, sort_order, image_url, display_price")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return ensureWomensInNav(FALLBACK_CATEGORIES);
    return ensureWomensInNav(data);
  } catch {
    return ensureWomensInNav(FALLBACK_CATEGORIES);
  }
}
