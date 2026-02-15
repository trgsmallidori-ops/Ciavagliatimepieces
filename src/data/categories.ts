/** Shop category slugs (for URL and product filtering). */
export const SHOP_CATEGORY_SLUGS = [
  "womens",
  "stealth",
  "sub-gmt",
  "chronograph",
  "44mm-diver",
  "others",
  "dj",
  "dd",
  "naut",
  "oak",
  "g-oak",
  "sky",
] as const;
export type ShopCategorySlug = (typeof SHOP_CATEGORY_SLUGS)[number];

export function isWatchStyleSlug(s: string): s is ShopCategorySlug {
  return (SHOP_CATEGORY_SLUGS as readonly string[]).includes(s);
}

/** Nav item: either a special link (configurator/shop) or a shop category. */
export type NavWatchItem =
  | { type: "configurator"; labelEn: string; labelFr: string }
  | { type: "shop"; labelEn: string; labelFr: string }
  | { type: "category"; slug: ShopCategorySlug; labelEn: string; labelFr: string };

/** Watch types for nav row and home page sections. Order matches screenshot. */
export const navWatchItems: NavWatchItem[] = [
  { type: "configurator", labelEn: "Customizer", labelFr: "Customiseur" },
  { type: "shop", labelEn: "Most Popular", labelFr: "Plus populaires" },
  { type: "category", slug: "womens", labelEn: "Womens", labelFr: "Femmes" },
  { type: "category", slug: "stealth", labelEn: "Stealth", labelFr: "Stealth" },
  { type: "category", slug: "sub-gmt", labelEn: "Sub/GMT", labelFr: "Sub/GMT" },
  { type: "category", slug: "chronograph", labelEn: "Chronograph", labelFr: "Chronographe" },
  { type: "category", slug: "44mm-diver", labelEn: "44mm Diver", labelFr: "44mm Diver" },
  { type: "category", slug: "others", labelEn: "Others+", labelFr: "Others+" },
  { type: "category", slug: "dj", labelEn: "DJ", labelFr: "DJ" },
  { type: "category", slug: "dd", labelEn: "DD", labelFr: "DD" },
  { type: "category", slug: "naut", labelEn: "Naut", labelFr: "Naut" },
  { type: "category", slug: "oak", labelEn: "Oak", labelFr: "Oak" },
  { type: "category", slug: "g-oak", labelEn: "G-OAK", labelFr: "G-OAK" },
  { type: "category", slug: "sky", labelEn: "Sky", labelFr: "Sky" },
];

/** For shop category page and admin dropdown: slug + labels. */
export const shopCategories = navWatchItems.filter(
  (item): item is NavWatchItem & { type: "category" } => item.type === "category"
);
