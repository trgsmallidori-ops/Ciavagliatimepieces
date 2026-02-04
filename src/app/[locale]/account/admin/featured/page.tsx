"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminFeaturedSlides,
  createFeaturedSlide,
  updateFeaturedSlide,
  deleteFeaturedSlide,
  uploadProductImage,
} from "../actions";
import type { FeaturedSlideRow } from "../actions";

export default function AdminFeaturedPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [slides, setSlides] = useState<FeaturedSlideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    image_url: string;
    image_url_secondary: string;
    title: string;
    subtitle: string;
    description: string;
    link_url: string;
  }>({
    image_url: "",
    image_url_secondary: "",
    title: "",
    subtitle: "",
    description: "",
    link_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setSlides(await getAdminFeaturedSlides());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ image_url: "", image_url_secondary: "", title: "", subtitle: "", description: "", link_url: "" });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setError(null);
    try {
      await updateFeaturedSlide(editingId, {
        image_url: form.image_url,
        image_url_secondary: form.image_url_secondary || null,
        title: form.title || null,
        subtitle: form.subtitle || null,
        description: form.description || null,
        link_url: form.link_url || null,
      });
      setSlides(await getAdminFeaturedSlides());
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleAdd = async () => {
    if (!form.image_url.trim()) return;
    setError(null);
    try {
      await createFeaturedSlide({
        image_url: form.image_url,
        image_url_secondary: form.image_url_secondary || null,
        title: form.title || null,
        subtitle: form.subtitle || null,
        description: form.description || null,
        link_url: form.link_url || null,
        sort_order: slides.length,
      });
      setSlides(await getAdminFeaturedSlides());
      setShowAdd(false);
      setForm({ image_url: "", image_url_secondary: "", title: "", subtitle: "", description: "", link_url: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cette slide ?" : "Delete this slide?")) return;
    setError(null);
    try {
      await deleteFeaturedSlide(id);
      setSlides((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-foreground/70">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error && !slides.length) {
    return (
      <div className="py-12">
        <p className="text-red-600">{error}</p>
        <a href={`/${locale}/account/manage`} className="mt-4 inline-block text-sm underline">
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
            <h1 className="text-3xl font-semibold">{isFr ? "À la une" : "Featured"}</h1>
            <p className="mt-1 text-foreground/70">
              {isFr
                ? "Séquences de la page d'accueil. Définissez les images, le titre, la description et le lien d'achat."
                : "Homepage feature sequences. Set images, title, description, and purchase URL."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setForm({ image_url: "", image_url_secondary: "", title: "", subtitle: "", description: "", link_url: "" });
              setError(null);
            }}
            className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
          >
            {isFr ? "Ajouter une slide" : "Add slide"}
          </button>
        </div>
      </ScrollReveal>

      {error && slides.length > 0 && (
        <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {showAdd && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h2 className="text-xl">{isFr ? "Nouvelle slide" : "New slide"}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Image" : "Image"}</label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {form.image_url && (
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                      <img src={form.image_url} alt="" className="h-full w-full object-cover" />
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
                          setForm((p) => ({ ...p, image_url: url }));
                        } catch (err) {
                          setImageError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={form.image_url}
                      onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                      placeholder={isFr ? "Ou coller une URL" : "Or paste image URL"}
                      className="w-full rounded-full border border-foreground/20 bg-white px-4 py-2 text-sm"
                    />
                  </div>
                </div>
                {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
                {uploadingImage && <p className="mt-1 text-sm text-foreground/60">{isFr ? "Upload..." : "Uploading..."}</p>}
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Image secondaire" : "Secondary image"}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {form.image_url_secondary && (
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                      <img src={form.image_url_secondary} alt="" className="h-full w-full object-cover" />
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
                          setForm((p) => ({ ...p, image_url_secondary: url }));
                        } catch (err) {
                          setImageError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={form.image_url_secondary}
                      onChange={(e) => setForm((p) => ({ ...p, image_url_secondary: e.target.value }))}
                      placeholder={isFr ? "Ou coller une URL" : "Or paste image URL"}
                      className="w-full rounded-full border border-foreground/20 bg-white px-4 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Titre" : "Title"}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={isFr ? "Nom de la montre" : "Watch title"}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Sous-titre" : "Subtitle"}</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder={isFr ? "Ex. Série limitée" : "e.g. Limited series"}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Description" : "Description"}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder={isFr ? "Texte descriptif" : "Descriptive text"}
                  className="mt-2 w-full rounded-2xl border border-foreground/20 bg-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "URL d'achat (bouton sur l'image)" : "Purchase URL (button on image)"}
                </label>
                <input
                  value={form.link_url}
                  onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
                  placeholder={locale === "fr" ? "/fr/shop/stealth" : "/en/shop/stealth"}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
                />
                <p className="mt-1 text-xs text-foreground/50">
                  {isFr ? "Ex. /fr/shop ou /fr/shop/chronograph" : "e.g. /en/shop or /en/shop/chronograph"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAdd} className="btn-hover rounded-full bg-foreground px-6 py-2 text-xs uppercase tracking-[0.2em] text-white">
                {isFr ? "Créer" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setForm({ image_url: "", link_url: "" }); }} className="btn-hover rounded-full border border-foreground/20 px-6 py-2 text-xs uppercase tracking-[0.2em]">
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-6">
        {slides.map((slide) => (
          <ScrollReveal key={slide.id}>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
              {editingId === slide.id ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {form.image_url && (
                      <div className="h-32 w-48 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                        <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {form.image_url_secondary && (
                      <div className="h-32 w-48 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                        <img src={form.image_url_secondary} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Primary image URL</label>
                        <input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Secondary image URL</label>
                        <input value={form.image_url_secondary} onChange={(e) => setForm((p) => ({ ...p, image_url_secondary: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Title</label>
                        <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Subtitle</label>
                        <input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1 w-full rounded-2xl border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Purchase URL</label>
                        <input value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSave} className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">
                      {isFr ? "Enregistrer" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEdit} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      {isFr ? "Annuler" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-foreground/5">
                      <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{slide.title || (isFr ? "— Sans titre" : "— Untitled")}</p>
                      <p className="text-xs text-foreground/50">{slide.link_url || (isFr ? "— Pas de lien" : "— No link")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingId(slide.id); setForm({ image_url: slide.image_url, image_url_secondary: slide.image_url_secondary ?? "", title: slide.title ?? "", subtitle: slide.subtitle ?? "", description: slide.description ?? "", link_url: slide.link_url || "" }); setError(null); }} className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                      {isFr ? "Modifier" : "Edit"}
                    </button>
                    <button type="button" onClick={() => handleDelete(slide.id)} className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-600">
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
