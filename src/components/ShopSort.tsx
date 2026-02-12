"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type SortOption = "price_asc" | "price_desc";

type ShopSortLabels = {
  sortBy: string;
  priceAscending: string;
  priceDescending: string;
};

export default function ShopSort({ labels }: { labels: ShopSortLabels }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") ?? "") as SortOption | "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SortOption | "";
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="shop-sort" className="text-sm text-white/80 whitespace-nowrap">
        {labels.sortBy}
      </label>
      <select
        id="shop-sort"
        value={current}
        onChange={handleChange}
        className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:border-[var(--logo-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--logo-gold)]"
      >
        <option value="">—</option>
        <option value="price_asc">{labels.priceAscending}</option>
        <option value="price_desc">{labels.priceDescending}</option>
      </select>
    </div>
  );
}
