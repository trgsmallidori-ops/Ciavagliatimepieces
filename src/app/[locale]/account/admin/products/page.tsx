"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminProducts,
  getAdminWatchCategories,
  getAdminProductImages,
  updateProduct,
  createProduct,
  deleteProduct,
  uploadProductImage,
  addProductImage,
  removeProductImage,
} from "../actions";
import type { WatchCategoryRow } from "../actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  specifications: string | null;
  price: number;
  original_price: number | null;
  image: string | null;
  stock: number | null;
  active: boolean | null;
  category: string | null;
};

export default function AdminProductsPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [products, setProducts] = useState<Product[]>([]);
  const [watchCategories, setWatchCategories] = useState<WatchCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<Partial<Product> & { stock?: number; category?: string; specifications?: string }>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<{ id: string; url: string; sort_order: number }[]>([]);
  const [newProductExtraImages, setNewProductExtraImages] = useState<string[]>([]);
  const [newProductExtraUrlInput, setNewProductExtraUrlInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getAdminProducts(),
          getAdminWatchCategories(),
        ]);
        setProducts(productsData);
        setWatchCategories(categoriesData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startEdit = async (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      description: p.description ?? "",
      specifications: (p as { specifications?: string | null }).specifications ?? "",
      price: p.price,
      original_price: p.original_price ?? undefined,
      image: p.image ?? "",
      stock: p.stock ?? 0,
      active: p.active ?? true,
      category: p.category ?? undefined,
    });
    setError(null);
    try {
      const images = await getAdminProductImages(p.id);
      setProductImages(images.map((i) => ({ id: i.id, url: i.url, sort_order: i.sort_order })));
    } catch {
      setProductImages([]);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
    setProductImages([]);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setError(null);
    try {
      await updateProduct({
        id: editingId,
        name: formData.name ?? "",
        description: formData.description ?? "",
        specifications: formData.specifications ?? null,
        price: Number(formData.price) ?? 0,
        original_price: formData.original_price != null ? Number(formData.original_price) : null,
        image: formData.image ?? "",
        stock: Number(formData.stock) ?? 0,
        active: formData.active ?? true,
        category: formData.category ?? null,
      });
      setProducts(await getAdminProducts());
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const getProductIdFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "product";

  const handleAdd = async () => {
    if (!formData.name) return;
    setError(null);
    try {
      await createProduct({
        name: formData.name,
        description: formData.description ?? "",
        specifications: formData.specifications ?? null,
        price: Number(formData.price) ?? 0,
        original_price: formData.original_price != null ? Number(formData.original_price) : null,
        image: formData.image ?? "/images/hero-1.svg",
        stock: Number(formData.stock) ?? 0,
        active: formData.active ?? true,
        category: formData.category ?? null,
      });
      const newId = getProductIdFromName(formData.name);
      for (let i = 0; i < newProductExtraImages.length; i++) {
        await addProductImage(newId, newProductExtraImages[i], i);
      }
      setProducts(await getAdminProducts());
      setShowAdd(false);
      setFormData({});
      setNewProductExtraImages([]);
      setNewProductExtraUrlInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isFr ? "Supprimer ce produit ?" : "Delete this product?")) return;
    setError(null);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAddProductImage = async (productId: string, url: string) => {
    if (!url.trim()) return;
    setError(null);
    try {
      await addProductImage(productId, url, productImages.length);
      const images = await getAdminProductImages(productId);
      setProductImages(images.map((i) => ({ id: i.id, url: i.url, sort_order: i.sort_order })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add image");
    }
  };

  const handleRemoveProductImage = async (imageId: string) => {
    setError(null);
    try {
      await removeProductImage(imageId);
      setProductImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove image");
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-white/90">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error && !products.length) {
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
            <h1 className="text-3xl font-semibold text-white">{isFr ? "Produits" : "Products"}</h1>
            <p className="mt-1 text-white/90">
              {isFr ? "Modifiez les prix, le stock et les produits." : "Edit prices, stock, and products."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setFormData({
                name: "",
                description: "",
                specifications: "",
                price: 0,
                original_price: undefined,
                image: "/images/hero-1.svg",
                stock: 0,
                active: true,
                category: undefined,
              });
              setNewProductExtraImages([]);
              setNewProductExtraUrlInput("");
              setError(null);
            }}
            className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
          >
            {isFr ? "Nouveau produit" : "Add product"}
          </button>
        </div>
      </ScrollReveal>

      {error && products.length > 0 && (
        <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {showAdd && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h2 className="text-xl">{isFr ? "Nouveau produit" : "New product"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Nom" : "Name"}</label>
                <input
                  value={formData.name ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Prix (CAD)" : "Price (CAD)"}</label>
                <input
                  type="number"
                  min={0}
                  value={formData.price ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, price: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Prix d'origine (CAD)" : "Original price (CAD)"}</label>
                <p className="mt-1 text-xs text-foreground/50">{isFr ? "Optionnel. Si rempli et > prix, affiche une réduction." : "Optional. If set and higher than price, shows a discount."}</p>
                <input
                  type="number"
                  min={0}
                  value={formData.original_price ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, original_price: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Description" : "Description"}</label>
                <textarea
                  rows={3}
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-foreground/20 bg-white px-4 py-2"
                  placeholder={isFr ? "Description du produit..." : "Product description..."}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Spécifications" : "Specifications"}</label>
                <textarea
                  rows={4}
                  value={formData.specifications ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, specifications: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-foreground/20 bg-white px-4 py-2"
                  placeholder={isFr ? "Une ligne par spécification (ex: Mouvement: automatique)" : "One line per spec (e.g. Movement: automatic)"}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Image principale" : "Main image"}</label>
                <p className="mt-1 text-xs text-foreground/50">{isFr ? "Utilisée comme miniature en boutique." : "Used as thumbnail in shop."}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {formData.image && (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                      <img src={formData.image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="block w-full max-w-sm text-sm text-foreground/70 file:mr-3 file:rounded-full file:border-0 file:bg-foreground/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.2em] file:text-foreground"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageError(null);
                        setUploadingImage(true);
                        try {
                          const fd = new FormData();
                          fd.append("image", file);
                          const { url } = await uploadProductImage(fd);
                          setFormData((p) => ({ ...p, image: url }));
                        } catch (err) {
                          setImageError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={formData.image ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, image: e.target.value }))}
                      placeholder={isFr ? "Ou coller une URL" : "Or paste image URL"}
                      className="w-full rounded-full border border-foreground/20 bg-white px-4 py-2 text-sm"
                    />
                  </div>
                </div>
                {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
                {uploadingImage && <p className="mt-1 text-sm text-foreground/60">{isFr ? "Upload..." : "Uploading..."}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Images supplémentaires" : "Additional images"}</label>
                <p className="mt-1 text-xs text-foreground/50">{isFr ? "Affichées dans la galerie sur la page produit." : "Shown in the gallery on the product page."}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {newProductExtraImages.map((url, idx) => (
                    <div key={idx} className="relative">
                      <div className="h-16 w-16 overflow-hidden rounded-lg bg-foreground/5">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProductExtraImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="block max-w-[140px] text-xs file:mr-1 file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageError(null);
                        setUploadingImage(true);
                        try {
                          const fd = new FormData();
                          fd.append("image", file);
                          const { url } = await uploadProductImage(fd);
                          setNewProductExtraImages((prev) => [...prev, url]);
                        } catch (err) {
                          setImageError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <form
                      className="flex gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const url = newProductExtraUrlInput.trim();
                        if (url) {
                          setNewProductExtraImages((prev) => [...prev, url]);
                          setNewProductExtraUrlInput("");
                        }
                      }}
                    >
                      <input
                        type="url"
                        value={newProductExtraUrlInput}
                        onChange={(e) => setNewProductExtraUrlInput(e.target.value)}
                        placeholder={isFr ? "URL image" : "Image URL"}
                        className="w-32 rounded border border-foreground/20 px-2 py-1 text-xs"
                      />
                      <button type="submit" className="rounded bg-foreground/10 px-2 py-1 text-xs">
                        +
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Stock" : "Stock"}</label>
                <input
                  type="number"
                  min={0}
                  value={formData.stock ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, stock: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Catégorie" : "Category"}</label>
                <select
                  value={formData.category ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value || undefined }))}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                >
                  <option value="">—</option>
                  {watchCategories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.label_en}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAdd} className="btn-hover rounded-full bg-foreground px-6 py-2 text-xs uppercase tracking-[0.2em] text-white">
                {isFr ? "Créer" : "Create"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-hover rounded-full border border-foreground/20 px-6 py-2 text-xs uppercase tracking-[0.2em]">
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-6">
        {products.map((p) => (
          <ScrollReveal key={p.id}>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
              <div className="flex flex-wrap gap-6">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[16px] bg-foreground/5">
                  <Image src={p.image ?? "/images/hero-1.svg"} alt={p.name} width={96} height={96} className="h-full w-full object-cover" />
                </div>
                {editingId === p.id ? (
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Name</label>
                        <input value={formData.name ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price (CAD)</label>
                        <input type="number" min={0} value={formData.price ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Prix d'origine (CAD)" : "Original price (CAD)"}</label>
                        <input type="number" min={0} value={formData.original_price ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value === "" ? undefined : Number(e.target.value) }))} placeholder="—" className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Description</label>
                        <textarea rows={3} value={formData.description ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="mt-1 w-full rounded-xl border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Spécifications" : "Specifications"}</label>
                        <textarea rows={4} value={formData.specifications ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, specifications: e.target.value }))} className="mt-1 w-full rounded-xl border border-foreground/20 bg-white px-3 py-2 text-sm" placeholder={isFr ? "Une ligne par spécification" : "One line per spec"} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Image</label>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          {formData.image && (
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-foreground/5">
                              <img src={formData.image} alt="" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block w-full max-w-xs text-sm text-foreground/70 file:mr-2 file:rounded-full file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.2em] file:text-foreground" disabled={uploadingImage} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setImageError(null);
                              setUploadingImage(true);
                              try {
                                const fd = new FormData();
                                fd.append("image", file);
                                const { url } = await uploadProductImage(fd);
                                setFormData((prev) => ({ ...prev, image: url }));
                              } catch (err) {
                                setImageError(err instanceof Error ? err.message : "Upload failed");
                              } finally {
                                setUploadingImage(false);
                                e.target.value = "";
                              }
                            }} />
                            <input value={formData.image ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))} placeholder="Or paste image URL" className="w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                          </div>
                        </div>
                        {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
                        {uploadingImage && <p className="mt-1 text-xs text-foreground/60">Uploading...</p>}
                      </div>
                      {editingId && (
                        <div className="sm:col-span-2">
                          <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Images supplémentaires" : "Extra images"}</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {productImages.map((img) => (
                              <div key={img.id} className="relative">
                                <div className="h-16 w-16 overflow-hidden rounded-lg bg-foreground/5">
                                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                                </div>
                                <button type="button" onClick={() => handleRemoveProductImage(img.id)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">×</button>
                              </div>
                            ))}
                            <div className="flex flex-col gap-1">
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block max-w-[140px] text-xs file:mr-1 file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground" disabled={uploadingImage} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !editingId) return;
                                setImageError(null);
                                setUploadingImage(true);
                                try {
                                  const fd = new FormData();
                                  fd.append("image", file);
                                  const { url } = await uploadProductImage(fd);
                                  await handleAddProductImage(editingId, url);
                                } catch (err) {
                                  setImageError(err instanceof Error ? err.message : "Upload failed");
                                } finally {
                                  setUploadingImage(false);
                                  e.target.value = "";
                                }
                              }} />
                              <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); const input = (e.currentTarget.elements.namedItem("extraImageUrl") as HTMLInputElement); const url = input?.value?.trim(); if (url && editingId) { handleAddProductImage(editingId, url); input.value = ""; } }}>
                                <input name="extraImageUrl" type="url" placeholder={isFr ? "URL image" : "Image URL"} className="w-32 rounded border border-foreground/20 px-2 py-1 text-xs" />
                                <button type="submit" className="rounded bg-foreground/10 px-2 py-1 text-xs">+</button>
                              </form>
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Stock" : "Stock"}</label>
                        <input type="number" min={0} value={formData.stock ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Catégorie" : "Category"}</label>
                        <select value={formData.category ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value || undefined }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm">
                          <option value="">—</option>
                          {watchCategories.map((c) => (
                            <option key={c.id} value={c.slug}>{c.label_en}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" id={`active-${p.id}`} checked={formData.active ?? true} onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))} className="h-4 w-4 rounded" />
                        <label htmlFor={`active-${p.id}`} className="text-sm">{isFr ? "Visible en boutique" : "Visible in shop"}</label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSave} className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Enregistrer" : "Save"}</button>
                      <button type="button" onClick={cancelEdit} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-semibold">{p.name}</h3>
                      <p className="mt-1 text-sm text-foreground/70">{p.description}</p>
                      <p className="mt-2 text-lg font-semibold">
                        C${Number(p.price).toLocaleString()}
                        {p.original_price != null && Number(p.original_price) > Number(p.price) && (
                          <span className="ml-2 text-sm font-normal text-foreground/60 line-through">C${Number(p.original_price).toLocaleString()}</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-foreground/60">
                        {isFr ? "Stock" : "Stock"}: {p.stock ?? 0}
                        {p.category && <span className="ml-2">· {watchCategories.find((c) => c.slug === p.category)?.label_en ?? p.category}</span>}
                        {!p.active && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{isFr ? "Masqué" : "Hidden"}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button type="button" onClick={() => startEdit(p)} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Modifier" : "Edit"}</button>
                      <button type="button" onClick={() => handleDelete(p.id)} className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-600">{isFr ? "Supprimer" : "Delete"}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
