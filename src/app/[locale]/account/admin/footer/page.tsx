"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import { getFooterSettings, setFooterSettings } from "../actions";
import type { FooterSettings, FooterLink } from "@/lib/footer-settings";

export default function AdminFooterPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FooterSettings | null>(null);

  useEffect(() => {
    getFooterSettings().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const update = (updates: Partial<FooterSettings>) => {
    if (!data) return;
    setData({ ...data, ...updates });
  };

  const updateExploreLink = (index: number, updates: Partial<FooterLink>) => {
    if (!data) return;
    const next = [...data.explore_links];
    next[index] = { ...next[index]!, ...updates };
    setData({ ...data, explore_links: next });
  };
  const addExploreLink = () => {
    if (!data) return;
    setData({ ...data, explore_links: [...data.explore_links, { label_en: "", label_fr: "", path: "/" }] });
  };
  const removeExploreLink = (index: number) => {
    if (!data) return;
    setData({ ...data, explore_links: data.explore_links.filter((_, i) => i !== index) });
  };

  const updateResourcesLink = (index: number, updates: Partial<FooterLink>) => {
    if (!data) return;
    const next = [...data.resources_links];
    next[index] = { ...next[index]!, ...updates };
    setData({ ...data, resources_links: next });
  };
  const addResourcesLink = () => {
    if (!data) return;
    setData({ ...data, resources_links: [...data.resources_links, { label_en: "", label_fr: "", path: "/" }] });
  };
  const removeResourcesLink = (index: number) => {
    if (!data) return;
    setData({ ...data, resources_links: data.resources_links.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      await setFooterSettings(data);
      if (isFr) alert("Pied de page enregistré.");
      else alert("Footer saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-8 text-white/70">
        {isFr ? "Chargement..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">
        {isFr ? "Pied de page" : "Footer"}
      </h1>
      <p className="text-sm text-white/70 max-w-xl">
        {isFr ? "Modifiez le texte et les liens du pied de page. Vous pouvez ajouter ou supprimer des entrées dans Explorer et Ressources." : "Edit the footer text and links. You can add or remove items in Explore and Resources."}
      </p>

      {error && (
        <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">{error}</p>
      )}

      <ScrollReveal>
        <div className="rounded-xl border border-white/20 bg-white/5 p-6 text-white space-y-8">
          {/* Brand */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">{isFr ? "Marque" : "Brand"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-white/60">{isFr ? "Titre (EN)" : "Title (EN)"}</label>
                <input value={data.brand_title_en} onChange={(e) => update({ brand_title_en: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/60">{isFr ? "Titre (FR)" : "Title (FR)"}</label>
                <input value={data.brand_title_fr} onChange={(e) => update({ brand_title_fr: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">{isFr ? "Description (EN)" : "Description (EN)"}</label>
                <input value={data.brand_description_en} onChange={(e) => update({ brand_description_en: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">{isFr ? "Description (FR)" : "Description (FR)"}</label>
                <input value={data.brand_description_fr} onChange={(e) => update({ brand_description_fr: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
            </div>
          </section>

          {/* Explore */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">{isFr ? "Colonne Explorer" : "Explore column"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <input value={data.explore_heading_en} onChange={(e) => update({ explore_heading_en: e.target.value })} placeholder="Heading (EN)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              <input value={data.explore_heading_fr} onChange={(e) => update({ explore_heading_fr: e.target.value })} placeholder="Heading (FR)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            </div>
            <p className="text-xs text-white/50 mb-2">{isFr ? "Liens (path = /shop ou https://...)" : "Links (path = /shop or https://...)"}</p>
            {data.explore_links.map((link, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
                <input value={link.label_en} onChange={(e) => updateExploreLink(i, { label_en: e.target.value })} placeholder="Label (EN)" className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <input value={link.label_fr} onChange={(e) => updateExploreLink(i, { label_fr: e.target.value })} placeholder="Label (FR)" className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <input value={link.path} onChange={(e) => updateExploreLink(i, { path: e.target.value })} placeholder="/path or https://..." className="w-40 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <button type="button" onClick={() => removeExploreLink(i)} className="rounded bg-red-500/30 px-2 py-1 text-xs text-red-200">×</button>
              </div>
            ))}
            <button type="button" onClick={addExploreLink} className="rounded border border-white/30 px-3 py-1.5 text-sm">{isFr ? "+ Ajouter un lien" : "+ Add link"}</button>
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">{isFr ? "Colonne Ressources" : "Resources column"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <input value={data.resources_heading_en} onChange={(e) => update({ resources_heading_en: e.target.value })} placeholder="Heading (EN)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              <input value={data.resources_heading_fr} onChange={(e) => update({ resources_heading_fr: e.target.value })} placeholder="Heading (FR)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            </div>
            {data.resources_links.map((link, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
                <input value={link.label_en} onChange={(e) => updateResourcesLink(i, { label_en: e.target.value })} placeholder="Label (EN)" className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <input value={link.label_fr} onChange={(e) => updateResourcesLink(i, { label_fr: e.target.value })} placeholder="Label (FR)" className="w-28 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <input value={link.path} onChange={(e) => updateResourcesLink(i, { path: e.target.value })} placeholder="/path or https://..." className="w-40 rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white" />
                <button type="button" onClick={() => removeResourcesLink(i)} className="rounded bg-red-500/30 px-2 py-1 text-xs text-red-200">×</button>
              </div>
            ))}
            <button type="button" onClick={addResourcesLink} className="rounded border border-white/30 px-3 py-1.5 text-sm">{isFr ? "+ Ajouter un lien" : "+ Add link"}</button>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">{isFr ? "Colonne Contact" : "Contact column"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={data.contact_heading_en} onChange={(e) => update({ contact_heading_en: e.target.value })} placeholder="Heading (EN)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              <input value={data.contact_heading_fr} onChange={(e) => update({ contact_heading_fr: e.target.value })} placeholder="Heading (FR)" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">Email</label>
                <input type="email" value={data.contact_email} onChange={(e) => update({ contact_email: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/60">{isFr ? "Téléphone" : "Phone"}</label>
                <input value={data.contact_phone} onChange={(e) => update({ contact_phone: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-white/60">{isFr ? "Ville (EN / FR)" : "City (EN / FR)"}</label>
                <div className="mt-1 flex gap-2">
                  <input value={data.contact_city_en} onChange={(e) => update({ contact_city_en: e.target.value })} placeholder="EN" className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
                  <input value={data.contact_city_fr} onChange={(e) => update({ contact_city_fr: e.target.value })} placeholder="FR" className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
                </div>
              </div>
            </div>
          </section>

          {/* Copyright */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">{isFr ? "Copyright (ligne du bas)" : "Copyright (bottom line)"}</h2>
            <p className="text-xs text-white/50 mb-2">© {new Date().getFullYear()} [ce texte]</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={data.copyright_text_en} onChange={(e) => update({ copyright_text_en: e.target.value })} placeholder="e.g. Ciavaglia Timepieces · Montreal" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
              <input value={data.copyright_text_fr} onChange={(e) => update({ copyright_text_fr: e.target.value })} placeholder="ex. Ciavaglia Timepieces · Montréal" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            </div>
          </section>

          <div className="pt-4">
            <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-[var(--logo-gold)] px-6 py-3 text-sm font-medium text-[var(--logo-green)] disabled:opacity-50">
              {saving ? "…" : (isFr ? "Enregistrer le pied de page" : "Save footer")}
            </button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
