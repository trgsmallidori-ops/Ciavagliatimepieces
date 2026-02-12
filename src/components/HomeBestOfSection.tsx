"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import { setHomeBestOf, uploadHomeCardImage } from "@/app/[locale]/account/admin/actions";
import type { HomeBestOfItem } from "@/app/[locale]/account/admin/actions";
import { useCurrency } from "@/components/CurrencyContext";

type Props = {
  locale: string;
  isAdmin: boolean;
  items: HomeBestOfItem[];
  sectionHeading: string;
  seeMoreLabel: string;
};

export default function HomeBestOfSection({
  locale,
  isAdmin,
  items,
  sectionHeading,
  seeMoreLabel,
}: Props) {
  const { formatPrice } = useCurrency();
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", image: "" });

  const openEdit = (index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingIndex(index);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      image: item.image,
    });
  };

  const handleUpload = () => {
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
        const { url } = await uploadHomeCardImage(fd);
        setForm((p) => ({ ...p, image: url }));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (editingIndex == null) return;
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum)) return;
    setSaving(true);
    try {
      const next = [...items];
      next[editingIndex] = {
        ...next[editingIndex]!,
        name: form.name,
        description: form.description,
        price: priceNum,
        image: form.image,
      };
      await setHomeBestOf(next);
      setEditingIndex(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <ScrollReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl uppercase tracking-[0.25em] text-foreground/80 md:text-3xl">
            {sectionHeading}
          </h2>
          <Link
            href={`/${locale}/shop`}
            className="text-sm uppercase tracking-[0.2em] text-foreground/70 underline underline-offset-4 transition hover:text-foreground"
          >
            {seeMoreLabel} →
          </Link>
        </ScrollReveal>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((watch, index) => (
            <ScrollReveal key={watch.id}>
              <div className="relative">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openEdit(index)}
                    className="absolute left-2 top-2 z-10 rounded bg-foreground/90 px-2 py-1 text-xs font-medium text-white hover:bg-foreground"
                  >
                    Edit
                  </button>
                )}
                <Link
                  href={`/${locale}/shop`}
                  className="group block overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
                >
                  <Image
                    src={watch.image}
                    alt={watch.name}
                    width={400}
                    height={360}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="p-6">
                    <h3 className="text-xl">{watch.name}</h3>
                    <p className="mt-1 text-sm text-foreground/70 line-clamp-2">{watch.description}</p>
                    <p className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-foreground">
                      {formatPrice(watch.price)}
                    </p>
                  </div>
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {editingIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingIndex(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Edit card</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-foreground/60">Image URL</label>
                <div className="flex gap-2">
                  <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} className="mt-1 flex-1 rounded border border-foreground/20 px-3 py-2 text-sm" />
                  <button type="button" onClick={handleUpload} disabled={uploading} className="mt-1 rounded border border-foreground/20 px-3 py-2 text-xs disabled:opacity-50">
                    {uploading ? "…" : "Upload"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-foreground/60">Title</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">Description</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">Price (CAD)</label>
                <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-foreground px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditingIndex(null)} className="rounded border border-foreground/20 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
