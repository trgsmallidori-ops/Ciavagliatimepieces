"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  setHomeStyleCards,
  updateWatchCategory,
  uploadHomeCardImage,
  uploadCategoryImage,
} from "@/app/[locale]/account/admin/actions";
import type { HomeStyleCards } from "@/lib/home-style-cards";
import type { WatchCategory } from "@/lib/watch-categories";

const collectionWatchImages = [
  "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=800&q=80",
  "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80",
  "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800&q=80",
];

type EditTarget =
  | { type: "custom_build" }
  | { type: "shop" }
  | { type: "category"; category: WatchCategory };

type Props = {
  locale: string;
  isAdmin: boolean;
  styleCards: HomeStyleCards;
  categories: WatchCategory[];
  sectionHeading: string;
};

export default function HomeStyleCardsSection({
  locale,
  isAdmin,
  styleCards,
  categories,
  sectionHeading,
}: Props) {
  const router = useRouter();
  const isFr = locale === "fr";
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state for modal
  const [imageUrl, setImageUrl] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [price, setPrice] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descFr, setDescFr] = useState("");

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    if (target.type === "custom_build") {
      setImageUrl(styleCards.custom_build.image_url);
      setTitleEn(styleCards.custom_build.title_en);
      setTitleFr(styleCards.custom_build.title_fr);
      setPrice(styleCards.custom_build.price != null ? String(styleCards.custom_build.price) : "");
      setDescEn(styleCards.custom_build.description_en);
      setDescFr(styleCards.custom_build.description_fr);
    } else if (target.type === "shop") {
      setImageUrl(styleCards.shop.image_url);
      setTitleEn(styleCards.shop.title_en);
      setTitleFr(styleCards.shop.title_fr);
      setPrice(styleCards.shop.price != null ? String(styleCards.shop.price) : "");
      setDescEn("");
      setDescFr("");
    } else {
      setImageUrl(target.category.image_url || "");
      setTitleEn(target.category.label_en);
      setTitleFr(target.category.label_fr);
      setPrice(target.category.display_price != null ? String(target.category.display_price) : "");
      setDescEn("");
      setDescFr("");
    }
  };

  const handleUpload = async (isCategory: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.set("image", file);
        const { url } = isCategory ? await uploadCategoryImage(fd) : await uploadHomeCardImage(fd);
        setImageUrl(url);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      if (editTarget.type === "custom_build") {
        await setHomeStyleCards({
          ...styleCards,
          custom_build: {
            ...styleCards.custom_build,
            image_url: imageUrl,
            title_en: titleEn,
            title_fr: titleFr,
            price: price === "" ? null : Number(price) || null,
            description_en: descEn,
            description_fr: descFr,
          },
        });
      } else if (editTarget.type === "shop") {
        await setHomeStyleCards({
          ...styleCards,
          shop: {
            ...styleCards.shop,
            image_url: imageUrl || collectionWatchImages[0],
            title_en: titleEn,
            title_fr: titleFr,
            price: price === "" ? null : Number(price) || null,
          },
        });
      } else {
        await updateWatchCategory(editTarget.category.id, {
          image_url: imageUrl || null,
          label_en: titleEn,
          label_fr: titleFr,
          display_price: price === "" ? null : Number(price) || null,
        });
      }
      setEditTarget(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (p: number | null) => {
    if (p == null) return null;
    return new Intl.NumberFormat(isFr ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(p);
  };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <ScrollReveal>
          <h2 className="text-center text-2xl uppercase tracking-[0.25em] text-foreground/80 md:text-3xl">
            {sectionHeading}
          </h2>
        </ScrollReveal>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Custom Build */}
          <ScrollReveal key="customizer">
            <div className="relative">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => openEdit({ type: "custom_build" })}
                  className="absolute left-2 top-2 z-10 rounded bg-foreground/90 px-2 py-1 text-xs font-medium text-white hover:bg-foreground"
                >
                  Edit
                </button>
              )}
              <Link
                href={`/${locale}/configurator`}
                className="group flex flex-col rounded-[28px] border-2 border-dashed border-foreground/25 bg-foreground/5 p-6 transition hover:border-foreground/40 hover:bg-foreground/10"
              >
                <div className="relative h-52 overflow-hidden rounded-[22px] bg-white/60">
                  {styleCards.custom_build.image_url ? (
                    <Image src={styleCards.custom_build.image_url} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.02]" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-4xl text-foreground/40 group-hover:text-foreground/60">+</span>
                  )}
                </div>
                <h3 className="mt-5 text-xl">{isFr ? styleCards.custom_build.title_fr : styleCards.custom_build.title_en}</h3>
                <p className="mt-2 text-sm text-foreground/70">{isFr ? styleCards.custom_build.description_fr : styleCards.custom_build.description_en}</p>
                {styleCards.custom_build.price != null && (
                  <p className="mt-2 text-sm font-medium text-foreground">{formatPrice(styleCards.custom_build.price)}</p>
                )}
              </Link>
            </div>
          </ScrollReveal>

          {/* Shop */}
          <ScrollReveal key="shop">
            <div className="relative">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => openEdit({ type: "shop" })}
                  className="absolute left-2 top-2 z-10 rounded bg-foreground/90 px-2 py-1 text-xs font-medium text-white hover:bg-foreground"
                >
                  Edit
                </button>
              )}
              <Link
                href={`/${locale}/shop`}
                className="group block rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
              >
                <Image
                  src={styleCards.shop.image_url || collectionWatchImages[0]}
                  alt={isFr ? styleCards.shop.title_fr : styleCards.shop.title_en}
                  width={320}
                  height={280}
                  className="h-52 w-full rounded-[22px] object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <h3 className="mt-5 text-xl">{isFr ? styleCards.shop.title_fr : styleCards.shop.title_en}</h3>
                {styleCards.shop.price != null && (
                  <p className="mt-2 text-sm font-medium text-foreground">{formatPrice(styleCards.shop.price)}</p>
                )}
              </Link>
            </div>
          </ScrollReveal>

          {/* Categories */}
          {categories.map((cat, index) => {
            const label = isFr ? cat.label_fr : cat.label_en;
            const image = cat.image_url || collectionWatchImages[(index + 1) % collectionWatchImages.length];
            return (
              <ScrollReveal key={cat.id}>
                <div className="relative">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openEdit({ type: "category", category: cat })}
                      className="absolute left-2 top-2 z-10 rounded bg-foreground/90 px-2 py-1 text-xs font-medium text-white hover:bg-foreground"
                    >
                      Edit
                    </button>
                  )}
                  <Link
                    href={`/${locale}/shop/${cat.slug}`}
                    className="group block rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
                  >
                    <Image
                      src={image}
                      alt={label}
                      width={320}
                      height={280}
                      className="h-52 w-full rounded-[22px] object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                    <h3 className="mt-5 text-xl">{label}</h3>
                    {cat.display_price != null && (
                      <p className="mt-2 text-sm font-medium text-foreground">{formatPrice(cat.display_price)}</p>
                    )}
                  </Link>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditTarget(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">
              {editTarget.type === "custom_build" ? "Edit Custom Build" : editTarget.type === "shop" ? "Edit Watches" : "Edit category"}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-foreground/60">Image URL</label>
                <div className="flex gap-2">
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 flex-1 rounded border border-foreground/20 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => handleUpload(editTarget.type === "category")} disabled={uploading} className="mt-1 rounded border border-foreground/20 px-3 py-2 text-xs disabled:opacity-50">
                    {uploading ? "…" : "Upload"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-foreground/60">Title (EN)</label>
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">Title (FR)</label>
                <input value={titleFr} onChange={(e) => setTitleFr(e.target.value)} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              {(editTarget.type === "custom_build") && (
                <>
                  <div>
                    <label className="text-xs text-foreground/60">Description (EN)</label>
                    <input value={descEn} onChange={(e) => setDescEn(e.target.value)} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60">Description (FR)</label>
                    <input value={descFr} onChange={(e) => setDescFr(e.target.value)} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-foreground/60">Price (optional, CAD)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Leave empty to hide" className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-foreground px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditTarget(null)} className="rounded border border-foreground/20 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
