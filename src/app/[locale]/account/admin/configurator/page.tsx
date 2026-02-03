"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import {
  getAdminConfiguratorSteps,
  getAdminConfiguratorOptions,
  createConfiguratorStep,
  updateConfiguratorStep,
  deleteConfiguratorStep,
  createConfiguratorOption,
  updateConfiguratorOption,
  deleteConfiguratorOption,
  getAdminConfiguratorAddons,
  getConfiguratorAddonOptionIds,
  setConfiguratorAddonOptions,
  createConfiguratorAddon,
  updateConfiguratorAddon,
  deleteConfiguratorAddon,
  uploadProductImage,
} from "../actions";
import type { ConfiguratorStepRow, ConfiguratorOptionRow, ConfiguratorAddonRow } from "../actions";

export default function AdminConfiguratorPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [steps, setSteps] = useState<ConfiguratorStepRow[]>([]);
  const [options, setOptions] = useState<ConfiguratorOptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({ label_en: "", label_fr: "", sort_order: 0 });
  const [showAddOption, setShowAddOption] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionStepId, setOptionStepId] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({
    step_id: "",
    parent_option_id: "" as string | null,
    label_en: "",
    label_fr: "",
    letter: "A",
    price: 0,
    image_url: "",
    preview_image_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [addons, setAddons] = useState<ConfiguratorAddonRow[]>([]);
  const [showAddAddon, setShowAddAddon] = useState(false);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [addonForm, setAddonForm] = useState({ step_id: "", label_en: "", label_fr: "", price: 0 });
  const [addonOptionIds, setAddonOptionIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [stepsData, optionsData, addonsData] = await Promise.all([
          getAdminConfiguratorSteps(),
          getAdminConfiguratorOptions(),
          getAdminConfiguratorAddons(),
        ]);
        setSteps(stepsData);
        setOptions(optionsData);
        setAddons(addonsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstStepId = steps[0]?.id ?? null;
  const firstStepOptions = firstStepId ? options.filter((o) => o.step_id === firstStepId && !o.parent_option_id) : [];

  const refreshAddons = async () => {
    setAddons(await getAdminConfiguratorAddons());
  };

  const openEditAddon = async (addon: ConfiguratorAddonRow) => {
    setEditingAddonId(addon.id);
    setAddonForm({ step_id: addon.step_id, label_en: addon.label_en, label_fr: addon.label_fr, price: addon.price });
    const ids = await getConfiguratorAddonOptionIds(addon.id);
    setAddonOptionIds(ids);
  };

  const handleSaveAddon = async () => {
    if (!editingAddonId) return;
    setError(null);
    try {
      await updateConfiguratorAddon(editingAddonId, { label_en: addonForm.label_en, label_fr: addonForm.label_fr, price: addonForm.price });
      await setConfiguratorAddonOptions(editingAddonId, addonOptionIds);
      await refreshAddons();
      setEditingAddonId(null);
      setAddonForm({ step_id: "", label_en: "", label_fr: "", price: 0 });
      setAddonOptionIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save add-on");
    }
  };

  const handleAddAddon = async () => {
    if (!addonForm.step_id || !addonForm.label_en.trim()) return;
    setError(null);
    try {
      const { step_id, label_en, label_fr, price } = addonForm;
      const id = await createConfiguratorAddon({ step_id, label_en, label_fr, price });
      await refreshAddons();
      setShowAddAddon(false);
      setAddonForm({ step_id: "", label_en: "", label_fr: "", price: 0 });
      if (id) await openEditAddon({ id, step_id, label_en, label_fr, price, sort_order: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add add-on");
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cet add-on ?" : "Delete this add-on?")) return;
    setError(null);
    try {
      await deleteConfiguratorAddon(id);
      await refreshAddons();
      if (editingAddonId === id) setEditingAddonId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const toggleAddonOption = (optionId: string) => {
    setAddonOptionIds((prev) => (prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId]));
  };

  const refreshOptions = async () => {
    setOptions(await getAdminConfiguratorOptions());
  };

  const handleSaveStep = async () => {
    if (!editingStepId) return;
    setError(null);
    try {
      await updateConfiguratorStep(editingStepId, stepForm);
      setSteps(await getAdminConfiguratorSteps());
      setEditingStepId(null);
      setStepForm({ label_en: "", label_fr: "", sort_order: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleAddStep = async () => {
    if (!stepForm.label_en.trim()) return;
    setError(null);
    try {
      await createConfiguratorStep({ ...stepForm, sort_order: steps.length });
      setSteps(await getAdminConfiguratorSteps());
      setShowAddStep(false);
      setStepForm({ label_en: "", label_fr: "", sort_order: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const handleDeleteStep = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cette étape et toutes ses options ?" : "Delete this step and all its options?")) return;
    setError(null);
    try {
      await deleteConfiguratorStep(id);
      setSteps(await getAdminConfiguratorSteps());
      setOptions(await getAdminConfiguratorOptions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleSaveOption = async () => {
    if (!editingOptionId) return;
    setError(null);
    try {
      await updateConfiguratorOption(editingOptionId, {
        label_en: optionForm.label_en,
        label_fr: optionForm.label_fr,
        letter: optionForm.letter,
        price: optionForm.price,
        image_url: optionForm.image_url || null,
        preview_image_url: optionForm.preview_image_url || null,
      });
      await refreshOptions();
      setEditingOptionId(null);
      resetOptionForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleAddOption = async () => {
    if (!optionForm.step_id || !optionForm.label_en.trim()) return;
    setError(null);
    try {
      await createConfiguratorOption({
        step_id: optionForm.step_id,
        parent_option_id: optionForm.parent_option_id || null,
        label_en: optionForm.label_en,
        label_fr: optionForm.label_fr,
        letter: optionForm.letter,
        price: optionForm.price,
        image_url: optionForm.image_url || null,
        preview_image_url: optionForm.preview_image_url || null,
      });
      await refreshOptions();
      setShowAddOption(false);
      resetOptionForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cette option ?" : "Delete this option?")) return;
    setError(null);
    try {
      await deleteConfiguratorOption(id);
      await refreshOptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  function resetOptionForm() {
    setOptionForm({
      step_id: optionStepId || "",
      parent_option_id: null,
      label_en: "",
      label_fr: "",
      letter: "A",
      price: 0,
      image_url: "",
      preview_image_url: "",
    });
  }

  const uploadImage = async (file: File, field: "image_url" | "preview_image_url") => {
    setImageError(null);
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { url } = await uploadProductImage(fd);
      setOptionForm((p) => ({ ...p, [field]: url }));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-foreground/70">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error && !steps.length) {
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
    <div className="space-y-10">
      <ScrollReveal>
        <div>
          <h1 className="text-3xl font-semibold">{isFr ? "Configurateur" : "Configurator"}</h1>
          <p className="mt-1 text-foreground/70">
            {isFr
              ? "Étapes du configurateur et options (avec images pour les cartes et l’aperçu de la montre)."
              : "Configurator steps and options (with images for option cards and watch preview)."}
          </p>
        </div>
      </ScrollReveal>

      {error && <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* Steps */}
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{isFr ? "Étapes" : "Steps"}</h2>
          <button
            type="button"
            onClick={() => { setShowAddStep(true); setStepForm({ label_en: "", label_fr: "", sort_order: steps.length }); setError(null); }}
            className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white"
          >
            {isFr ? "Ajouter une étape" : "Add step"}
          </button>
        </div>
      </ScrollReveal>

      {showAddStep && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h3 className="text-lg">{isFr ? "Nouvelle étape" : "New step"}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                <input value={stepForm.label_en} onChange={(e) => setStepForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                <input value={stepForm.label_fr} onChange={(e) => setStepForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAddStep} className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Créer" : "Create"}</button>
              <button type="button" onClick={() => { setShowAddStep(false); }} className="btn-hover rounded-full border border-foreground/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-4">
        {steps.map((step) => (
          <ScrollReveal key={step.id}>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
              {editingStepId === step.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                      <input value={stepForm.label_en} onChange={(e) => setStepForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                      <input value={stepForm.label_fr} onChange={(e) => setStepForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveStep} className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Enregistrer" : "Save"}</button>
                    <button type="button" onClick={() => setEditingStepId(null)} className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{step.label_en}</h3>
                    <p className="text-sm text-foreground/60">{step.label_fr} · {options.filter((o) => o.step_id === step.id).length} {isFr ? "options" : "options"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingStepId(step.id); setStepForm({ label_en: step.label_en, label_fr: step.label_fr, sort_order: step.sort_order }); }} className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Modifier" : "Edit"}</button>
                    <button type="button" onClick={() => handleDeleteStep(step.id)} className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-600">{isFr ? "Supprimer" : "Delete"}</button>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Optional add-ons */}
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 pt-10">
          <h2 className="text-xl font-semibold">{isFr ? "Add-ons optionnels" : "Optional add-ons"}</h2>
          <button
            type="button"
            onClick={() => { setShowAddAddon(true); setAddonForm({ step_id: steps[0]?.id ?? "", label_en: "", label_fr: "", price: 0 }); setError(null); }}
            className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white"
          >
            {isFr ? "Ajouter un add-on" : "Add add-on"}
          </button>
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          {isFr ? "Les add-ons s'affichent sur une étape et ne sont disponibles que pour les options que vous sélectionnez ci-dessous." : "Add-ons appear on a step and are only available for the options you assign below."}
        </p>
      </ScrollReveal>

      {showAddAddon && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h3 className="text-lg">{isFr ? "Nouvel add-on" : "New add-on"}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Étape" : "Step"}</label>
                <select value={addonForm.step_id} onChange={(e) => setAddonForm((p) => ({ ...p, step_id: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2">
                  {steps.map((s) => (
                    <option key={s.id} value={s.id}>{s.label_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                <input value={addonForm.label_en} onChange={(e) => setAddonForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" placeholder="e.g. Frosted Finish" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                <input value={addonForm.label_fr} onChange={(e) => setAddonForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price ($)</label>
                <input type="number" value={addonForm.price} onChange={(e) => setAddonForm((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAddAddon} className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Créer puis assigner options" : "Create then assign options"}</button>
              <button type="button" onClick={() => setShowAddAddon(false)} className="btn-hover rounded-full border border-foreground/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
            </div>
          </div>
        </ScrollReveal>
      )}

      <div className="space-y-4">
        {addons.length === 0 && !showAddAddon && <p className="text-sm text-foreground/50">{isFr ? "Aucun add-on." : "No add-ons."}</p>}
        {addons.map((addon) => {
          const step = steps.find((s) => s.id === addon.step_id);
          const stepOptions = options.filter((o) => o.step_id === addon.step_id);
          return (
            <ScrollReveal key={addon.id}>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
                {editingAddonId === addon.id ? (
                  <div className="space-y-4">
                    <h3 className="text-lg">{isFr ? "Modifier l'add-on et assigner les options" : "Edit add-on and assign options"}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                        <input value={addonForm.label_en} onChange={(e) => setAddonForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                        <input value={addonForm.label_fr} onChange={(e) => setAddonForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price ($)</label>
                        <input type="number" value={addonForm.price} onChange={(e) => setAddonForm((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Disponible lorsque l'option suivante est sélectionnée" : "Available when this option is selected"}</label>
                      <p className="mt-1 text-xs text-foreground/50">{isFr ? "Cochez les options (de l'étape) pour lesquelles cet add-on est proposé." : "Check the options (from this step) for which this add-on is offered."}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {stepOptions.map((opt) => (
                          <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-foreground/20 bg-white/80 px-4 py-2">
                            <input type="checkbox" checked={addonOptionIds.includes(opt.id)} onChange={() => toggleAddonOption(opt.id)} className="rounded border-foreground/30 text-foreground" />
                            <span className="text-sm">{opt.label_en}</span>
                          </label>
                        ))}
                        {stepOptions.length === 0 && <p className="text-sm text-foreground/50">{isFr ? "Aucune option dans cette étape." : "No options in this step."}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveAddon} className="btn-hover rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Enregistrer" : "Save"}</button>
                      <button type="button" onClick={() => { setEditingAddonId(null); }} className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{addon.label_en}</p>
                      <p className="text-sm text-foreground/60">{step?.label_en ?? addon.step_id} · ${addon.price}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditAddon(addon)} className="rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase">{isFr ? "Modifier / options" : "Edit / options"}</button>
                      <button type="button" onClick={() => handleDeleteAddon(addon.id)} className="btn-hover rounded-full border border-red-200 px-4 py-2 text-xs text-red-600">{isFr ? "Supprimer" : "Delete"}</button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Options */}
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 pt-10">
          <h2 className="text-xl font-semibold">{isFr ? "Options par étape" : "Options by step"}</h2>
          <button
            type="button"
            onClick={() => { setShowAddOption(true); setOptionStepId(steps[0]?.id ?? null); setOptionForm({ step_id: steps[0]?.id ?? "", parent_option_id: null, label_en: "", label_fr: "", letter: "A", price: 0, image_url: "", preview_image_url: "" }); setError(null); }}
            className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white"
          >
            {isFr ? "Ajouter une option" : "Add option"}
          </button>
        </div>
      </ScrollReveal>

      {showAddOption && (
        <ScrollReveal>
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <h3 className="text-lg">{isFr ? "Nouvelle option" : "New option"}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Étape" : "Step"}</label>
                <select value={optionForm.step_id} onChange={(e) => setOptionForm((p) => ({ ...p, step_id: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2">
                  {steps.map((s) => (
                    <option key={s.id} value={s.id}>{s.label_en}</option>
                  ))}
                </select>
              </div>
              {steps.length > 1 && (
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Parent (option de l’étape 1)" : "Parent (step 1 option)"}</label>
                  <select value={optionForm.parent_option_id ?? ""} onChange={(e) => setOptionForm((p) => ({ ...p, parent_option_id: e.target.value || null }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2">
                    <option value="">— {isFr ? "Aucun" : "None"} (étape 1)</option>
                    {firstStepOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label_en}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                <input value={optionForm.label_en} onChange={(e) => setOptionForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                <input value={optionForm.label_fr} onChange={(e) => setOptionForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Letter</label>
                <input value={optionForm.letter} onChange={(e) => setOptionForm((p) => ({ ...p, letter: e.target.value.slice(0, 1) }))} maxLength={1} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price ($)</label>
                <input type="number" value={optionForm.price} onChange={(e) => setOptionForm((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Image (carte)" : "Image (card)"}</label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {optionForm.image_url && <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-foreground/5"><img src={optionForm.image_url} alt="" className="h-full w-full object-cover" /></div>}
                  <div className="flex-1">
                    <input type="file" accept="image/*" disabled={uploadingImage} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "image_url"); e.target.value = ""; }} className="text-sm file:mr-2 file:rounded file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-xs" />
                    <input value={optionForm.image_url} onChange={(e) => setOptionForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Or URL" className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-4 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">{isFr ? "Image aperçu montre" : "Watch preview image"}</label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {optionForm.preview_image_url && <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-foreground/5"><img src={optionForm.preview_image_url} alt="" className="h-full w-full object-cover" /></div>}
                  <div className="flex-1">
                    <input type="file" accept="image/*" disabled={uploadingImage} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "preview_image_url"); e.target.value = ""; }} className="text-sm file:mr-2 file:rounded file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-xs" />
                    <input value={optionForm.preview_image_url} onChange={(e) => setOptionForm((p) => ({ ...p, preview_image_url: e.target.value }))} placeholder="Or URL" className="mt-1 w-full rounded-full border border-foreground/20 bg-white px-4 py-2 text-sm" />
                  </div>
                </div>
              </div>
            </div>
            {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleAddOption} className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Créer" : "Create"}</button>
              <button type="button" onClick={() => { setShowAddOption(false); }} className="btn-hover rounded-full border border-foreground/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* List options grouped by step */}
      <div className="space-y-6">
        {steps.map((step) => {
          const stepOptions = options.filter((o) => o.step_id === step.id);
          return (
            <ScrollReveal key={step.id}>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
                <h3 className="text-lg font-semibold">{step.label_en} ({stepOptions.length})</h3>
                <div className="mt-4 space-y-3">
                  {stepOptions.map((opt) => (
                    <div key={opt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-white/50 p-4">
                      <div className="flex items-center gap-4">
                        {opt.image_url && <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg"><img src={opt.image_url} alt="" className="h-full w-full object-cover" /></div>}
                        <div>
                          <p className="font-medium">{opt.label_en}</p>
                          <p className="text-xs text-foreground/50">{opt.letter} · ${opt.price} {opt.parent_option_id ? `· parent` : ""}</p>
                        </div>
                        {opt.preview_image_url && <div className="h-10 w-10 shrink-0 overflow-hidden rounded"><img src={opt.preview_image_url} alt="" className="h-full w-full object-cover" /></div>}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingOptionId(opt.id); setOptionForm({ step_id: opt.step_id, parent_option_id: opt.parent_option_id, label_en: opt.label_en, label_fr: opt.label_fr, letter: opt.letter, price: opt.price, image_url: opt.image_url ?? "", preview_image_url: opt.preview_image_url ?? "" }); setShowAddOption(false); }} className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs uppercase">{isFr ? "Modifier" : "Edit"}</button>
                        <button type="button" onClick={() => handleDeleteOption(opt.id)} className="btn-hover rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600">{isFr ? "Supprimer" : "Delete"}</button>
                      </div>
                    </div>
                  ))}
                  {stepOptions.length === 0 && <p className="text-sm text-foreground/50">{isFr ? "Aucune option." : "No options."}</p>}
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Inline edit option */}
      {editingOptionId && (
        <ScrollReveal>
          <div className="rounded-[28px] border-2 border-foreground/30 bg-white/90 p-6">
            <h3 className="text-lg">{isFr ? "Modifier l’option" : "Edit option"}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (EN)</label>
                <input value={optionForm.label_en} onChange={(e) => setOptionForm((p) => ({ ...p, label_en: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Label (FR)</label>
                <input value={optionForm.label_fr} onChange={(e) => setOptionForm((p) => ({ ...p, label_fr: e.target.value }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Letter</label>
                <input value={optionForm.letter} onChange={(e) => setOptionForm((p) => ({ ...p, letter: e.target.value.slice(0, 1) }))} maxLength={1} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price ($)</label>
                <input type="number" value={optionForm.price} onChange={(e) => setOptionForm((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-foreground/60">Image (card) / Watch preview URL</label>
                <input value={optionForm.image_url} onChange={(e) => setOptionForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Card image URL" className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
                <input value={optionForm.preview_image_url} onChange={(e) => setOptionForm((p) => ({ ...p, preview_image_url: e.target.value }))} placeholder="Preview image URL" className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleSaveOption} className="btn-hover rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-white">{isFr ? "Enregistrer" : "Save"}</button>
              <button type="button" onClick={() => setEditingOptionId(null)} className="btn-hover rounded-full border border-foreground/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">{isFr ? "Annuler" : "Cancel"}</button>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
