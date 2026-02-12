"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import { setFaqSettings } from "@/app/[locale]/account/admin/actions";
import type { FaqSettings, FaqItem } from "@/lib/faq-settings";

const emptyItem: FaqItem = {
  question_en: "",
  question_fr: "",
  answer_en: "",
  answer_fr: "",
};

type Props = {
  locale: string;
  isAdmin: boolean;
  faq: FaqSettings;
};

export default function FaqPageContent({ locale, isAdmin, faq }: Props) {
  const router = useRouter();
  const isFr = locale === "fr";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FaqSettings>(faq);

  const heading = isFr ? faq.heading_fr : faq.heading_en;
  const intro = isFr ? faq.intro_fr : faq.intro_en;

  const update = (updates: Partial<FaqSettings>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const updateItem = (index: number, updates: Partial<FaqItem>) => {
    setData((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index]!, ...updates };
      return { ...prev, items: next };
    });
  };

  const addItem = () => {
    setData((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index: number) => {
    setData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const openEdit = () => {
    setData(faq);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setFaqSettings(data);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl space-y-10">
          <ScrollReveal>
            <div className="relative">
              {isAdmin && (
                <button
                  type="button"
                  onClick={openEdit}
                  className="absolute right-0 top-0 rounded bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30"
                >
                  {isFr ? "Modifier" : "Edit"}
                </button>
              )}
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">FAQ</p>
              <h1 className="mt-4 text-4xl text-white">{heading}</h1>
              <p className="mt-4 text-white/80">{intro}</p>
            </div>
          </ScrollReveal>
          <div className="space-y-4">
            {faq.items.map((item, index) => {
              const question = isFr ? item.question_fr : item.question_en;
              const answer = isFr ? item.answer_fr : item.answer_en;
              return (
                <ScrollReveal key={index}>
                  <div className="rounded-[26px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
                    <h2 className="text-xl">{question}</h2>
                    <p className="mt-3 text-foreground/70">{answer}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{isFr ? "Modifier la FAQ" : "Edit FAQ"}</h3>
            {error && <p className="mt-2 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}
            <div className="mt-4 space-y-6">
              <div>
                <label className="text-xs text-foreground/60">{isFr ? "Titre (EN)" : "Heading (EN)"}</label>
                <input value={data.heading_en} onChange={(e) => update({ heading_en: e.target.value })} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">{isFr ? "Titre (FR)" : "Heading (FR)"}</label>
                <input value={data.heading_fr} onChange={(e) => update({ heading_fr: e.target.value })} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">{isFr ? "Intro (EN)" : "Intro (EN)"}</label>
                <input value={data.intro_en} onChange={(e) => update({ intro_en: e.target.value })} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-foreground/60">{isFr ? "Intro (FR)" : "Intro (FR)"}</label>
                <input value={data.intro_fr} onChange={(e) => update({ intro_fr: e.target.value })} className="mt-1 w-full rounded border border-foreground/20 px-3 py-2 text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground/80">{isFr ? "Questions et réponses" : "Questions & answers"}</label>
                  <button type="button" onClick={addItem} className="rounded border border-foreground/30 px-2 py-1 text-xs">+ {isFr ? "Ajouter" : "Add"}</button>
                </div>
                <div className="mt-2 space-y-3">
                  {data.items.map((item, index) => (
                    <div key={index} className="rounded border border-foreground/15 bg-foreground/5 p-3">
                      <div className="mb-2 flex justify-end">
                        <button type="button" onClick={() => removeItem(index)} className="text-xs text-red-600 hover:underline">{isFr ? "Supprimer" : "Remove"}</button>
                      </div>
                      <input value={item.question_en} onChange={(e) => updateItem(index, { question_en: e.target.value })} placeholder="Question (EN)" className="mb-2 w-full rounded border border-foreground/20 px-2 py-1.5 text-sm" />
                      <input value={item.question_fr} onChange={(e) => updateItem(index, { question_fr: e.target.value })} placeholder="Question (FR)" className="mb-2 w-full rounded border border-foreground/20 px-2 py-1.5 text-sm" />
                      <textarea value={item.answer_en} onChange={(e) => updateItem(index, { answer_en: e.target.value })} placeholder="Answer (EN)" rows={2} className="mb-2 w-full rounded border border-foreground/20 px-2 py-1.5 text-sm" />
                      <textarea value={item.answer_fr} onChange={(e) => updateItem(index, { answer_fr: e.target.value })} placeholder="Answer (FR)" rows={2} className="w-full rounded border border-foreground/20 px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-foreground px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "…" : (isFr ? "Enregistrer" : "Save")}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded border border-foreground/20 px-4 py-2 text-sm">
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
