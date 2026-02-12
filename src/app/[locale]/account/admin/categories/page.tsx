"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminWatchCategories,
  getAdminProducts,
  createWatchCategory,
  updateWatchCategory,
  deleteWatchCategory,
  reorderWatchCategory,
  updateProduct,
  uploadCategoryImage,
} from "../actions";
import type { WatchCategoryRow } from "../actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number | null;
  active: boolean | null;
  category: string | null;
};

export default function AdminCategoriesPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [watchCategories, setWatchCategories] = useState<WatchCategoryRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<{ slug: string; label_en: string; label_fr: string; image_url: string }>({
    slug: "",
    label_en: "",
    label_fr: "",
    image_url: "",
  });
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [categoriesData, productsData] = await Promise.all([
          getAdminWatchCategories(),
          getAdminProducts(),
        ]);
        setWatchCategories(categoriesData);
        setProducts(productsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startEditCategory = (c: WatchCategoryRow) => {
    setEditingCategoryId(c.id);
    setCategoryForm({ slug: c.slug, label_en: c.label_en, label_fr: c.label_fr, image_url: c.image_url ?? "" });
    setError(null);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ slug: "", label_en: "", label_fr: "", image_url: "" });
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("image", file);
      const { url } = await uploadCategoryImage(fd);
      setUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId) return;
    setError(null);
    try {
      await updateWatchCategory(editingCategoryId, {
        slug: categoryForm.slug,
        label_en: categoryForm.label_en,
        label_fr: categoryForm.label_fr,
        image_url: categoryForm.image_url || null,
      });
      setWatchCategories(await getAdminWatchCategories());
      cancelEditCategory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save category");
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.slug.trim()) return;
    setError(null);
    try {
      await createWatchCategory({
        slug: categoryForm.slug,
        label_en: categoryForm.label_en,
        label_fr: categoryForm.label_fr,
        image_url: categoryForm.image_url || null,
      });
      setWatchCategories(await getAdminWatchCategories());
      setShowAddCategory(false);
      setCategoryForm({ slug: "", label_en: "", label_fr: "", image_url: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cette catégorie ?" : "Delete this category?")) return;
    setError(null);
    try {
      await deleteWatchCategory(id);
      setWatchCategories(await getAdminWatchCategories());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleReorder = async (categoryId: string, direction: "up" | "down") => {
    setError(null);
    setReorderingId(categoryId);
    try {
      await reorderWatchCategory(categoryId, direction);
      setWatchCategories(await getAdminWatchCategories());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    } finally {
      setReorderingId(null);
    }
  };

  const handleAssignProductToCategory = async (productId: string, categorySlug: string) => {
    setError(null);
    try {
      const p = products.find((x) => x.id === productId);
      if (!p) return;
      await updateProduct({
        id: productId,
        name: p.name,
        description: p.description ?? "",
        price: p.price,
        image: p.image ?? "",
        stock: p.stock ?? 0,
        active: p.active ?? true,
        category: categorySlug,
      });
      setProducts(await getAdminProducts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-white/90">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error && !watchCategories.length) {
    return (
      <div className="py-12">
        <p className="text-red-600">{error}</p>
        <a href={`/${locale}/account/manage`} className="mt-4 inline-block text-sm text-white underline hover:text-white/90">
          {isFr ? "Retour au compte" : "Back to account"}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{isFr ? "Catégories" : "Categories"}</h1>
            <p className="mt-1 text-white/90">
              {isFr ? "Ajoutez des catégories et assignez des montres." : "Add categories and assign watches to them."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddCategory(true);
              setCategoryForm({ slug: "", label_en: "", label_fr: "", image_url: "" });
              setError(null);
            }}
            className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
          >
            {isFr ? "Nouvelle catégorie" : "New category"}
          </button>
        </div>
      </ScrollReveal>

      {error && watchCategories.length > 0 && (
        <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {showAddCategory && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h2 className="text-xl">{isFr ? "Nouvelle catégorie" : "New category"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">Slug (URL)</label>
                <input value={categoryForm.slug} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="sub-gmt" className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">Label (EN)</label>
                <input value={categoryForm.label_en} onChange={(e) => setCategoryForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">Label (FR)</label>
                <input value={categoryForm.label_fr} onChange={(e) => setCategoryForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Image (carte Accueil)" : "Image (home card)"}</label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input value={categoryForm.image_url} onChange={(e) => setCategoryForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://…" className="min-w-0 flex-1 rounded-full border border-foreground/20 bg-white px-4 py-2" />
                  <label className="cursor-pointer rounded-full border border-foreground/20 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleCategoryImageUpload(e, (url) => setCategoryForm((p) => ({ ...p, image_url: url })))} disabled={imageUploading} />
                    {imageUploading ? "…" : (isFr ? "Téléverser" : "Upload")}
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAddCategory} className="btn-hover rounded-full bg-foreground px-6 py-2 text-xs uppercase tracking-[0.2em] text-white">
                {isFr ? "Créer" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowAddCategory(false); setCategoryForm({ slug: "", label_en: "", label_fr: "", image_url: "" }); }} className="btn-hover rounded-full border border-foreground/20 px-6 py-2 text-xs uppercase tracking-[0.2em]">
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-6">
        {watchCategories.map((cat, index) => (
          <ScrollReveal key={cat.id}>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
              {editingCategoryId === cat.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Slug</label>
                      <input value={categoryForm.slug} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                      <input value={categoryForm.label_en} onChange={(e) => setCategoryForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                      <input value={categoryForm.label_fr} onChange={(e) => setCategoryForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Image (carte Accueil « Choisissez votre style »)" : "Image (home « Select your style » card)"}</label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <input value={categoryForm.image_url} onChange={(e) => setCategoryForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://…" className="min-w-0 flex-1 rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                        <label className="cursor-pointer rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm uppercase tracking-[0.2em] disabled:opacity-50">
                          <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleCategoryImageUpload(e, (url) => setCategoryForm((p) => ({ ...p, image_url: url })))} disabled={imageUploading} />
                          {imageUploading ? "…" : (isFr ? "Téléverser" : "Upload")}
                        </label>
                      </div>
                      {categoryForm.image_url ? <img src={categoryForm.image_url} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover" /> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveCategory} className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">
                      {isFr ? "Enregistrer" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEditCategory} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      {isFr ? "Annuler" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">{cat.label_en}</h3>
                    <p className="mt-1 text-sm text-foreground/70">{cat.slug}</p>
                    <p className="mt-2 text-xs text-foreground/60">
                      {isFr ? "Montres dans cette catégorie" : "Watches in this category"}: {products.filter((p) => p.category === cat.slug).map((p) => p.name).join(", ") || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-foreground/60">{isFr ? "Ajouter une montre" : "Add watch"}:</label>
                      <select
                        className="rounded-full border border-foreground/20 bg-white px-3 py-1.5 text-sm"
                        onChange={(e) => {
                          const productId = e.target.value;
                          if (productId) handleAssignProductToCategory(productId, cat.slug);
                          e.target.value = "";
                        }}
                      >
                        <option value="">—</option>
                        {products.filter((p) => p.category !== cat.slug).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="text-xs text-foreground/50">{isFr ? "Ordre nav" : "Nav order"}:</span>
                    <button
                      type="button"
                      title={isFr ? "Monter" : "Move up"}
                      disabled={index === 0 || reorderingId === cat.id}
                      onClick={() => handleReorder(cat.id, "up")}
                      className="btn-hover rounded-full border border-foreground/20 px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title={isFr ? "Descendre" : "Move down"}
                      disabled={index === watchCategories.length - 1 || reorderingId === cat.id}
                      onClick={() => handleReorder(cat.id, "down")}
                      className="btn-hover rounded-full border border-foreground/20 px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => startEditCategory(cat)} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      {isFr ? "Modifier" : "Edit"}
                    </button>
                    <button type="button" onClick={() => handleDeleteCategory(cat.id)} className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-600">
                      {isFr ? "Supprimer" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
