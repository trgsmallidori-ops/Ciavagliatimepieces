"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminAddonTemplates,
  getAddonTemplateOptions,
  createAddonTemplate,
  updateAddonTemplate,
  deleteAddonTemplate,
  createAddonTemplateOption,
  updateAddonTemplateOption,
  deleteAddonTemplateOption,
  applyAddonTemplateToProducts,
  getProductIdsWithAddonTemplate,
  getAdminProducts,
  uploadProductImage,
} from "../actions";
import type {
  AddonTemplateRow,
  AddonTemplateOptionRow,
} from "../actions";

type Product = { id: string; name: string };

export default function AdminAddonsPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [templates, setTemplates] = useState<AddonTemplateRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [options, setOptions] = useState<AddonTemplateOptionRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);

  const [createLabelEn, setCreateLabelEn] = useState("");
  const [createLabelFr, setCreateLabelFr] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createImageUploading, setCreateImageUploading] = useState(false);

  const [editLabelEn, setEditLabelEn] = useState("");
  const [editLabelFr, setEditLabelFr] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  const [newOptLabelEn, setNewOptLabelEn] = useState("");
  const [newOptLabelFr, setNewOptLabelFr] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [newOptImageUrl, setNewOptImageUrl] = useState("");
  const [newOptImageUploading, setNewOptImageUploading] = useState(false);

  const loadTemplates = async () => {
    try {
      const list = await getAdminAddonTemplates();
      setTemplates(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tList, pList] = await Promise.all([
          getAdminAddonTemplates(),
          getAdminProducts(),
        ]);
        setTemplates(tList);
        setProducts((pList as Product[]).map((p) => ({ id: p.id, name: (p as { name: string }).name })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setOptions([]);
      return;
    }
    getAddonTemplateOptions(editingId).then(setOptions).catch(() => setOptions([]));
  }, [editingId]);

  useEffect(() => {
    if (!showApply) {
      setSelectedProductIds([]);
      return;
    }
    getProductIdsWithAddonTemplate(showApply).then(setSelectedProductIds).catch(() => setSelectedProductIds([]));
  }, [showApply]);

  const startEdit = (t: AddonTemplateRow) => {
    setEditingId(t.id);
    setEditLabelEn(t.label_en);
    setEditLabelFr(t.label_fr);
    setEditImageUrl(t.image_url ?? "");
  };

  const handleCreate = async () => {
    if (!createLabelEn.trim()) return;
    setError(null);
    try {
      const id = await createAddonTemplate({
        label_en: createLabelEn.trim(),
        label_fr: createLabelFr.trim() || createLabelEn.trim(),
        image_url: createImageUrl.trim() || undefined,
      });
      await loadTemplates();
      setShowCreate(false);
      setCreateLabelEn("");
      setCreateLabelFr("");
      setCreateImageUrl("");
      setEditingId(id);
      startEdit({ id, label_en: createLabelEn.trim(), label_fr: createLabelFr.trim() || createLabelEn.trim(), image_url: createImageUrl.trim() || "/images/hero-1.svg", sort_order: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingId) return;
    setError(null);
    try {
      await updateAddonTemplate(editingId, {
        label_en: editLabelEn.trim(),
        label_fr: editLabelFr.trim(),
        image_url: editImageUrl.trim() || undefined,
      });
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cet extra et ses options ?" : "Delete this add-on and its options?")) return;
    setError(null);
    try {
      await deleteAddonTemplate(id);
      if (editingId === id) setEditingId(null);
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAddOption = async () => {
    if (!editingId || !newOptLabelEn.trim()) return;
    setError(null);
    try {
      await createAddonTemplateOption({
        addon_template_id: editingId,
        label_en: newOptLabelEn.trim(),
        label_fr: newOptLabelFr.trim() || newOptLabelEn.trim(),
        price: Number(newOptPrice) || 0,
        image_url: newOptImageUrl.trim() || null,
        sort_order: options.length,
      });
      setOptions(await getAddonTemplateOptions(editingId));
      setNewOptLabelEn("");
      setNewOptLabelFr("");
      setNewOptPrice("");
      setNewOptImageUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add option");
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    setError(null);
    try {
      await deleteAddonTemplateOption(optionId);
      if (editingId) setOptions(await getAddonTemplateOptions(editingId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete option");
    }
  };

  const handleApplyToProducts = async () => {
    if (!showApply) return;
    setApplyLoading(true);
    setError(null);
    try {
      const { applied, removedAll } = await applyAddonTemplateToProducts(showApply, selectedProductIds);
      setShowApply(null);
      setSelectedProductIds([]);
      if (removedAll) {
        alert(isFr ? "Extra retiré de toutes les montres." : "Add-on removed from all watches.");
      } else {
        alert(isFr ? `${applied} montre(s) mise(s) à jour.` : `${applied} watch(es) updated.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setApplyLoading(false);
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="py-8 text-white/70">
        {isFr ? "Chargement..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">
        {isFr ? "Extras (bibliothèque)" : "Add-ons (library)"}
      </h1>
      <p className="text-sm text-white/70 max-w-xl">
        {isFr
          ? "Créez un extra (nom, image), ajoutez des options (styles, prix, images), puis appliquez-le aux montres de votre choix."
          : "Create an add-on (name, image), add options (styles, prices, images), then apply it to the watches you choose."}
      </p>

      {error && (
        <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">{error}</p>
      )}

      <ScrollReveal>
        <div className="rounded-xl border border-white/20 bg-white/5 p-4">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            {showCreate ? (isFr ? "Annuler" : "Cancel") : (isFr ? "+ Créer un extra" : "+ Create add-on")}
          </button>
          {showCreate && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={createLabelEn}
                onChange={(e) => setCreateLabelEn(e.target.value)}
                placeholder={isFr ? "Nom (EN)" : "Name (EN)"}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
              />
              <input
                value={createLabelFr}
                onChange={(e) => setCreateLabelFr(e.target.value)}
                placeholder={isFr ? "Nom (FR)" : "Name (FR)"}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
              />
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  value={createImageUrl}
                  onChange={(e) => setCreateImageUrl(e.target.value)}
                  placeholder={isFr ? "URL image" : "Image URL"}
                  className="flex-1 min-w-[200px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-white/80 file:rounded file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-white"
                  disabled={createImageUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCreateImageUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("image", f);
                      const { url } = await uploadProductImage(fd);
                      setCreateImageUrl(url);
                    } finally {
                      setCreateImageUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!createLabelEn.trim()}
                className="rounded-full bg-[var(--logo-gold)] px-4 py-2 text-sm font-medium text-[var(--logo-green)] disabled:opacity-50"
              >
                {isFr ? "Créer" : "Create"}
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>

      <div className="space-y-4">
        {templates.map((t) => (
          <ScrollReveal key={t.id}>
            <div className="rounded-[22px] border border-white/20 bg-white/5 p-6 text-white">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
                  <img src={t.image_url || "/images/hero-1.svg"} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{isFr ? t.label_fr : t.label_en}</h2>
                  <p className="text-sm text-white/60">
                    {isFr ? "Options" : "Options"}: {editingId === t.id ? options.length : (t as { option_count?: number }).option_count ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => (editingId === t.id ? setEditingId(null) : startEdit(t))}
                    className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    {editingId === t.id ? (isFr ? "Fermer" : "Close") : (isFr ? "Modifier" : "Edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApply(t.id)}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                  >
                    {isFr ? "Appliquer à des montres" : "Apply to watches"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="rounded-full border border-red-400/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                  >
                    {isFr ? "Supprimer" : "Delete"}
                  </button>
                </div>
              </div>

              {editingId === t.id && (
                <div className="mt-6 space-y-6 border-t border-white/10 pt-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={editLabelEn}
                      onChange={(e) => setEditLabelEn(e.target.value)}
                      placeholder={isFr ? "Nom (EN)" : "Name (EN)"}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                    />
                    <input
                      value={editLabelFr}
                      onChange={(e) => setEditLabelFr(e.target.value)}
                      placeholder={isFr ? "Nom (FR)" : "Name (FR)"}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                    />
                    <div className="sm:col-span-2">
                      <input
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder={isFr ? "URL image" : "Image URL"}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                      />
                    </div>
                    <button type="button" onClick={handleUpdateTemplate} className="rounded-full bg-white/20 px-4 py-2 text-sm">
                      {isFr ? "Enregistrer" : "Save"}
                    </button>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2">{isFr ? "Options (styles, prix, images)" : "Options (styles, prices, images)"}</p>
                    <ul className="space-y-2 mb-4">
                      {options.map((opt) => (
                        <li key={opt.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                          {opt.image_url && (
                            <img src={opt.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <span className="font-medium">{isFr ? opt.label_fr : opt.label_en}</span>
                          <span className="text-[var(--logo-gold)]">C${opt.price}</span>
                          <button type="button" onClick={() => handleDeleteOption(opt.id)} className="ml-auto text-red-400 hover:underline text-xs">×</button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-end gap-2">
                      <input value={newOptLabelEn} onChange={(e) => setNewOptLabelEn(e.target.value)} placeholder={isFr ? "Label (EN)" : "Label (EN)"} className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                      <input value={newOptLabelFr} onChange={(e) => setNewOptLabelFr(e.target.value)} placeholder={isFr ? "Label (FR)" : "Label (FR)"} className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                      <input type="number" min={0} value={newOptPrice} onChange={(e) => setNewOptPrice(e.target.value)} placeholder="Price" className="w-20 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                      <input value={newOptImageUrl} onChange={(e) => setNewOptImageUrl(e.target.value)} placeholder={isFr ? "Image URL ou upload" : "Image URL or upload"} className="w-40 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs text-white/60">{isFr ? "Téléverser" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="text-xs text-white/80 file:rounded file:border-0 file:bg-white/20 file:px-2 file:py-1 file:text-white file:text-xs"
                          disabled={newOptImageUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setNewOptImageUploading(true);
                            setError(null);
                            try {
                              const fd = new FormData();
                              fd.append("image", file);
                              const { url } = await uploadProductImage(fd);
                              setNewOptImageUrl(url);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Upload failed");
                            } finally {
                              setNewOptImageUploading(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <button type="button" onClick={handleAddOption} disabled={!newOptLabelEn.trim()} className="rounded bg-white/20 px-3 py-1.5 text-sm disabled:opacity-50">
                        {isFr ? "Ajouter" : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>

      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-[var(--logo-green)] p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">{isFr ? "Appliquer cet extra à des montres" : "Apply this add-on to watches"}</h3>
            <p className="text-sm text-white/80 mb-4">{isFr ? "Cochez les montres qui auront cet extra." : "Check the watches that should have this add-on."}</p>
            <ul className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`apply-${p.id}`}
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <label htmlFor={`apply-${p.id}`} className="text-sm">{p.name}</label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyToProducts}
                disabled={applyLoading}
                className="rounded-full bg-[var(--logo-gold)] px-4 py-2 text-sm font-medium text-[var(--logo-green)] disabled:opacity-50"
              >
                {applyLoading ? "…" : isFr ? `Appliquer à ${selectedProductIds.length} montre(s)` : `Apply to ${selectedProductIds.length} watch(es)`}
              </button>
              <button type="button" onClick={() => { setShowApply(null); setSelectedProductIds([]); }} className="rounded-full border border-white/40 px-4 py-2 text-sm">
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
