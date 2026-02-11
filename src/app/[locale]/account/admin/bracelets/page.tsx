"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminWatchBracelets,
  getAdminProducts,
  getProductIdsByBracelet,
  createWatchBracelet,
  updateWatchBracelet,
  deleteWatchBracelet,
  setBraceletProducts,
  uploadProductImage,
} from "../actions";
import type { WatchBraceletRow } from "../actions";

type ProductRow = { id: string; name: string };

export default function AdminVariantsPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [variants, setVariants] = useState<WatchBraceletRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productIdsByVariant, setProductIdsByVariant] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createImageUploading, setCreateImageUploading] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [selectedProductIdsByVariant, setSelectedProductIdsByVariant] = useState<Record<string, string[]>>({});
  const [savingAssignmentFor, setSavingAssignmentFor] = useState<string | null>(null);

  const load = async () => {
    try {
      const [variantList, productList, idsByBracelet] = await Promise.all([
        getAdminWatchBracelets(),
        getAdminProducts(),
        getProductIdsByBracelet(),
      ]);
      setVariants(variantList);
      setProducts(
        (productList as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name }))
      );
      setProductIdsByVariant(idsByBracelet);
      setSelectedProductIdsByVariant(idsByBracelet);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
  }, []);

  const startEdit = (b: WatchBraceletRow) => {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditImageUrl(b.image_url);
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    setError(null);
    try {
      await createWatchBracelet({
        title: createTitle.trim(),
        image_url: createImageUrl.trim() || "/images/hero-1.svg",
        sort_order: variants.length,
      });
      await load();
      setShowCreate(false);
      setCreateTitle("");
      setCreateImageUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setError(null);
    try {
      await updateWatchBracelet(editingId, {
        title: editTitle.trim(),
        image_url: editImageUrl.trim(),
      });
      await load();
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        isFr
          ? "Supprimer cette variante ? Elle sera retirée de tous les produits."
          : "Delete this variant? It will be removed from all products."
      )
    )
      return;
    setError(null);
    try {
      await deleteWatchBracelet(id);
      if (editingId === id) setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const toggleProductForVariant = (variantId: string, productId: string, checked: boolean) => {
    setSelectedProductIdsByVariant((prev) => {
      const current = prev[variantId] ?? [];
      if (checked) {
        return { ...prev, [variantId]: [...current, productId] };
      }
      return { ...prev, [variantId]: current.filter((id) => id !== productId) };
    });
  };

  const handleSaveAssignment = async (variantId: string) => {
    setSavingAssignmentFor(variantId);
    setError(null);
    try {
      await setBraceletProducts(variantId, selectedProductIdsByVariant[variantId] ?? []);
      setProductIdsByVariant((prev) => ({
        ...prev,
        [variantId]: selectedProductIdsByVariant[variantId] ?? [],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save assignment");
    } finally {
      setSavingAssignmentFor(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-white/90">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              {isFr ? "Variantes" : "Variants"}
            </h1>
            <p className="mt-1 text-white/90">
              {isFr
                ? "Créez des variantes (ex. bracelets) et choisissez les montres sur lesquelles elles sont proposées."
                : "Create variants (e.g. bracelets) and choose which watches they apply to."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setError(null);
              setCreateTitle("");
              setCreateImageUrl("");
            }}
            className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
          >
            {isFr ? "Nouvelle variante" : "Add variant"}
          </button>
        </div>
      </ScrollReveal>

      {error && (
        <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showCreate && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h2 className="text-xl">
              {isFr ? "Nouvelle variante" : "New variant"}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Nom" : "Name"}
                </label>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                  placeholder={isFr ? "ex. Rubber Blue" : "e.g. Rubber Blue"}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Image" : "Image"}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {createImageUrl && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-foreground/5">
                      <img src={createImageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="block w-full max-w-xs text-sm text-foreground/70 file:mr-2 file:rounded-full file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.2em] file:text-foreground"
                      disabled={createImageUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCreateImageUploading(true);
                        setError(null);
                        try {
                          const fd = new FormData();
                          fd.append("image", file);
                          const { url } = await uploadProductImage(fd);
                          setCreateImageUrl(url);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setCreateImageUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={createImageUrl}
                      onChange={(e) => setCreateImageUrl(e.target.value)}
                      placeholder={isFr ? "Ou URL image" : "Or image URL"}
                      className="w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!createTitle.trim()}
                className="btn-hover rounded-full bg-foreground px-6 py-2 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
              >
                {isFr ? "Créer" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-hover rounded-full border border-foreground/20 px-6 py-2 text-xs uppercase tracking-[0.2em]"
              >
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-4">
        {variants.length === 0 && !showCreate ? (
          <p className="text-white/70">
            {isFr
              ? "Aucune variante. Ajoutez-en et assignez-les aux montres ci-dessous."
              : "No variants. Add some and assign them to watches below."}
          </p>
        ) : (
          variants.map((b) => (
            <ScrollReveal key={b.id}>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
                {editingId === b.id ? (
                  <div className="flex flex-wrap items-start gap-6">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                      <img src={editImageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">
                          {isFr ? "Nom" : "Name"}
                        </label>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">
                          {isFr ? "Image" : "Image"}
                        </label>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="block max-w-[200px] text-xs file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground"
                            disabled={editImageUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setEditImageUploading(true);
                              setError(null);
                              try {
                                const fd = new FormData();
                                fd.append("image", file);
                                const { url } = await uploadProductImage(fd);
                                setEditImageUrl(url);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Upload failed");
                              } finally {
                                setEditImageUploading(false);
                                e.target.value = "";
                              }
                            }}
                          />
                          <input
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            className="min-w-[200px] rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                        >
                          {isFr ? "Enregistrer" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]"
                        >
                          {isFr ? "Annuler" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                        <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
                        <p className="text-xs text-foreground/60">
                          {(productIdsByVariant[b.id] ?? []).length}{" "}
                          {isFr ? "produit(s)" : "product(s)"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]"
                        >
                          {isFr ? "Modifier" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-600"
                        >
                          {isFr ? "Supprimer" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-foreground/10 pt-4">
                      <h4 className="text-xs uppercase tracking-[0.2em] text-foreground/60 mb-3">
                        {isFr ? "Appliquer à ces montres" : "Apply to these watches"}
                      </h4>
                      {products.length === 0 ? (
                        <p className="text-sm text-foreground/60">
                          {isFr ? "Aucun produit. Créez-en dans Produits." : "No products. Create some in Products."}
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {products.map((p) => {
                              const selected = (selectedProductIdsByVariant[b.id] ?? []).includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className="flex cursor-pointer items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) =>
                                      toggleProductForVariant(b.id, p.id, e.target.checked)
                                    }
                                    className="h-4 w-4 rounded"
                                  />
                                  <span className="text-foreground">{p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveAssignment(b.id)}
                            disabled={savingAssignmentFor === b.id}
                            className="mt-3 rounded-full bg-foreground/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-foreground disabled:opacity-50"
                          >
                            {savingAssignmentFor === b.id
                              ? isFr
                                ? "Enregistrement…"
                                : "Saving…"
                              : isFr
                                ? "Enregistrer l’assignation"
                                : "Save assignment"}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollReveal>
          ))
        )}
      </div>
    </div>
  );
}
