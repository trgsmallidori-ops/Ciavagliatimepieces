"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { href: "orders", labelEn: "Orders", labelFr: "Commandes" },
  { href: "products", labelEn: "Products", labelFr: "Produits" },
  { href: "categories", labelEn: "Categories", labelFr: "Catégories" },
  { href: "configurator", labelEn: "Configurator", labelFr: "Configurateur" },
  { href: "featured", labelEn: "Featured", labelFr: "À la une" },
  { href: "journal", labelEn: "Journal", labelFr: "Journal" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ locale?: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/${locale}/account/login`);
        return;
      }
      setChecked(true);
    });
  }, [locale, router]);

  if (!checked) {
    return (
      <section className="px-6">
        <div className="mx-auto max-w-6xl py-12">
          <p className="text-foreground/70">{isFr ? "Chargement..." : "Loading..."}</p>
        </div>
      </section>
    );
  }

  const base = `/${locale}/account/admin`;
  const pathSegment = pathname?.replace(base, "").split("/").filter(Boolean)[0] ?? "orders";

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl py-8">
        <div className="mb-8 border-b border-foreground/10 pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">Admin</p>
          <nav className="mt-3 flex flex-wrap gap-2" aria-label={isFr ? "Administration" : "Admin navigation"}>
            {navItems.map((item) => {
              const href = `${base}/${item.href}`;
              const active = pathSegment === item.href;
              const label = isFr ? item.labelFr : item.labelEn;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium uppercase tracking-[0.2em] transition ${
                    active
                      ? "bg-foreground text-white"
                      : "border border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        {children}
      </div>
    </section>
  );
}
