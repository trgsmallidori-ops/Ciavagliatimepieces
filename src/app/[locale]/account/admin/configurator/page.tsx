"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getAdminConfiguratorSteps,
  getAdminConfiguratorOptions,
  getFunctionOptions,
  getFunctionSteps,
  setFunctionSteps,
  createConfiguratorStep,
  updateConfiguratorStep,
  deleteConfiguratorStep,
  createConfiguratorOption,
  updateConfiguratorOption,
  deleteConfiguratorOption,
  getConfiguratorAddonOptionIds,
  setConfiguratorAddonOptions,
  getAdminConfiguratorAddons,
  updateConfiguratorAddon,
  uploadProductImage,
  getConfiguratorDiscount,
  setConfiguratorDiscount,
  getConfiguratorFreeShipping,
  setConfiguratorFreeShipping,
} from "../actions";
import type {
  ConfiguratorStepRow,
  ConfiguratorOptionRow,
  ConfiguratorAddonRow,
} from "../actions";

const STEP_KEYS: { key: string; labelEn: string; labelFr: string }[] = [
  { key: "function", labelEn: "Function", labelFr: "Fonction" },
  { key: "size", labelEn: "Size", labelFr: "Taille" },
  { key: "case", labelEn: "Case", labelFr: "Boîtier" },
  { key: "dial", labelEn: "Dial", labelFr: "Cadran" },
  { key: "hands", labelEn: "Hands", labelFr: "Aiguilles" },
  { key: "strap", labelEn: "Strap", labelFr: "Bracelet" },
  { key: "extra", labelEn: "Extra", labelFr: "Extra" },
];

export default function AdminConfiguratorPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [steps, setSteps] = useState<ConfiguratorStepRow[]>([]);
  const [options, setOptions] = useState<ConfiguratorOptionRow[]>([]);
  const [functionOptions, setFunctionOptions] = useState<ConfiguratorOptionRow[]>([]);
  const [functionStepsMap, setFunctionStepsMap] = useState<Record<string, string[]>>({});
  const [addons, setAddons] = useState<ConfiguratorAddonRow[]>([]);
  const [addonsWithOptions, setAddonsWithOptions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuratorDiscountPercent, setConfiguratorDiscountPercent] = useState<number>(0);
  const [configuratorDiscountSaving, setConfiguratorDiscountSaving] = useState(false);
  const [configuratorFreeShipping, setConfiguratorFreeShippingState] = useState<boolean>(false);
  const [configuratorFreeShippingSaving, setConfiguratorFreeShippingSaving] = useState(false);

  /** Which watch type we're "editing as" — step bar and options match customer view for this type */
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [currentStepKey, setCurrentStepKey] = useState("function");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({
    step_id: "",
    parent_option_id: "" as string | null,
    label_en: "",
    label_fr: "",
    letter: "A",
    price: 0,
    discount_percent: 0,
    image_url: "",
    preview_image_url: "",
  });
  const [showAddOption, setShowAddOption] = useState(false);

  const [editingFunctionStepsFor, setEditingFunctionStepsFor] = useState<string | null>(null);
  const [functionStepIds, setFunctionStepIds] = useState<string[]>([]);

  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [addonForm, setAddonForm] = useState({ label_en: "", label_fr: "", price: 0 });

  const [showCreateStep, setShowCreateStep] = useState(false);
  const [stepForm, setStepForm] = useState({
    label_en: "",
    label_fr: "",
    step_key: "",
    optional: false,
    image_url: "",
  });
  const [createStepLoading, setCreateStepLoading] = useState(false);
  const [deleteStepLoading, setDeleteStepLoading] = useState(false);
  const [stepImageForm, setStepImageForm] = useState({ image_url: "" });
  const [savingStepImage, setSavingStepImage] = useState(false);
  const [uploadingStepImage, setUploadingStepImage] = useState(false);
  const [uploadingOptionImage, setUploadingOptionImage] = useState<"image" | "preview" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [stepsData, optionsData, funcOpts, addonsData] = await Promise.all([
        getAdminConfiguratorSteps(),
        getAdminConfiguratorOptions(),
        getFunctionOptions(),
        getAdminConfiguratorAddons(),
      ]);
      setSteps(stepsData);
      setOptions(optionsData);
      setFunctionOptions(funcOpts);
      setAddons(addonsData);
      const map: Record<string, string[]> = {};
      await Promise.all(
        (funcOpts ?? []).map(async (f) => {
          const ids = await getFunctionSteps(f.id);
          map[f.id] = ids;
        })
      );
      setFunctionStepsMap(map);
      const addonIds = (addonsData ?? []).map((a) => a.id);
      const optionIdsByAddon: Record<string, string[]> = {};
      await Promise.all(
        addonIds.map(async (id) => {
          const ids = await getConfiguratorAddonOptionIds(id);
          optionIdsByAddon[id] = ids;
        })
      );
      setAddonsWithOptions(optionIdsByAddon);
      const discount = await getConfiguratorDiscount();
      setConfiguratorDiscountPercent(discount);
      const freeShip = await getConfiguratorFreeShipping();
      setConfiguratorFreeShippingState(freeShip);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unauthorized");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (functionOptions.length > 0 && selectedFunctionId === null) {
      setSelectedFunctionId(functionOptions[0].id);
    }
  }, [functionOptions, selectedFunctionId]);

  const functionStep = steps.find((s) => (s as { step_key?: string }).step_key === "function");
  const caseStep = steps.find((s) => (s as { step_key?: string }).step_key === "case");
  const stepsAfterFunction = steps.filter((s) => (s as { step_key?: string }).step_key !== "function");
  /** When editing "which steps follow", show selected steps in their current order so ↑↓ move visually */
  const orderedStepsForFunctionEdit = useMemo(() => {
    const selected = functionStepIds
      .map((id) => stepsAfterFunction.find((s) => s.id === id))
      .filter((s): s is ConfiguratorStepRow => !!s);
    const unselected = stepsAfterFunction.filter((s) => !functionStepIds.includes(s.id));
    return [...selected, ...unselected];
  }, [stepsAfterFunction, functionStepIds]);

  const stepIdToMeta = useMemo(
    () => new Map(steps.map((s) => [s.id, s as ConfiguratorStepRow & { step_key?: string }])),
    [steps]
  );

  /** Step IDs (and keys) for the selected watch type — same as customer sees */
  const stepIdsForFunction = selectedFunctionId ? (functionStepsMap[selectedFunctionId] ?? []) : [];
  const stepsForFunction = useMemo(() => {
    const keys = stepIdsForFunction
      .map((sid) => stepIdToMeta.get(sid)?.step_key)
      .filter((k): k is string => !!k);
    return ["function", ...keys];
  }, [stepIdsForFunction, stepIdToMeta]);

  const currentStepMeta = STEP_KEYS.find((s) => s.key === currentStepKey);
  const currentStepRow = steps.find((s) => (s as { step_key?: string }).step_key === currentStepKey);
  const currentStepId =
    currentStepKey === "function" ? functionStep?.id : stepIdsForFunction[stepsForFunction.indexOf(currentStepKey) - 1];

  /** Options for current step filtered for selected function (same as customer) */
  const optionsForCurrentStep = useMemo(() => {
    if (!currentStepId) return currentStepKey === "function" ? functionOptions : [];
    return options.filter(
      (o) =>
        o.step_id === currentStepId &&
        (o.parent_option_id === null || o.parent_option_id === selectedFunctionId)
    );
  }, [options, currentStepId, currentStepKey, selectedFunctionId, functionOptions]);

  const caseAddons = caseStep ? addons.filter((a) => a.step_id === caseStep.id) : [];
  const caseOptions = caseStep ? options.filter((o) => o.step_id === caseStep.id && (o.parent_option_id === null || o.parent_option_id === selectedFunctionId)) : [];

  const nextSortOrder = useMemo(() => {
    if (!steps.length) return 1;
    const max = Math.max(...steps.map((s) => (s as ConfiguratorStepRow & { sort_order?: number }).sort_order ?? 0));
    return max + 1;
  }, [steps]);

  const handleCreateStep = async () => {
    const key = stepForm.step_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || null;
    if (!stepForm.label_en.trim()) {
      setError(isFr ? "Label (EN) requis." : "Label (EN) required.");
      return;
    }
    if (!key) {
      setError(isFr ? "Clé d’étape requise (ex. custom_rotor, extra_2)." : "Step key required (e.g. custom_rotor, extra_2).");
      return;
    }
    setError(null);
    setCreateStepLoading(true);
    try {
      await createConfiguratorStep({
        label_en: stepForm.label_en.trim(),
        label_fr: stepForm.label_fr.trim() || stepForm.label_en.trim(),
        step_key: key,
        optional: stepForm.optional,
        sort_order: nextSortOrder,
        image_url: stepForm.image_url.trim() || null,
      });
      await load();
      setShowCreateStep(false);
      setStepForm({ label_en: "", label_fr: "", step_key: "", optional: false, image_url: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create step");
    } finally {
      setCreateStepLoading(false);
    }
  };

  const handleDeleteStep = async () => {
    const row = currentStepRow as (ConfiguratorStepRow & { step_key?: string }) | undefined;
    if (!row?.id || row.step_key === "function") return;
    const msg = isFr
      ? "Supprimer cette étape ? Les options et les liens aux types de montre seront supprimés."
      : "Delete this step? Its options and links to watch types will be removed.";
    if (!confirm(msg)) return;
    setError(null);
    setDeleteStepLoading(true);
    try {
      await deleteConfiguratorStep(row.id);
      await load();
      setCurrentStepKey("function");
      setEditingOptionId(null);
      setShowAddOption(false);
      setEditingFunctionStepsFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete step");
    } finally {
      setDeleteStepLoading(false);
    }
  };

  useEffect(() => {
    const row = currentStepRow as (ConfiguratorStepRow & { image_url?: string }) | undefined;
    setStepImageForm({ image_url: row?.image_url ?? "" });
  }, [currentStepRow?.id, (currentStepRow as { image_url?: string })?.image_url]);

  const handleSaveStepImage = async () => {
    const row = currentStepRow as (ConfiguratorStepRow & { step_key?: string }) | undefined;
    if (!row?.id || row.step_key === "function") return;
    setError(null);
    setSavingStepImage(true);
    try {
      await updateConfiguratorStep(row.id, { image_url: stepImageForm.image_url.trim() || null });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save step image");
    } finally {
      setSavingStepImage(false);
    }
  };

  const suggestStepKeyFromLabel = (labelEn: string) => {
    const slug = labelEn
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (slug) setStepForm((p) => ({ ...p, step_key: slug }));
  };

  const openEditFunctionSteps = async (functionOptionId: string) => {
    setEditingFunctionStepsFor(functionOptionId);
    const ids = await getFunctionSteps(functionOptionId);
    setFunctionStepIds(ids);
  };

  const handleSaveFunctionSteps = async () => {
    if (!editingFunctionStepsFor) return;
    setError(null);
    try {
      await setFunctionSteps(editingFunctionStepsFor, functionStepIds);
      await load();
      setEditingFunctionStepsFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const toggleFunctionStep = (stepId: string) => {
    setFunctionStepIds((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const moveFunctionStep = (stepId: string, dir: "up" | "down") => {
    setFunctionStepIds((prev) => {
      const i = prev.indexOf(stepId);
      if (i === -1) return prev;
      const next = [...prev];
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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
        discount_percent: optionForm.discount_percent ?? null,
        parent_option_id: optionForm.parent_option_id || null,
        image_url: optionForm.image_url.trim() || null,
        preview_image_url: optionForm.preview_image_url.trim() || null,
      });
      await load();
      setEditingOptionId(null);
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
        discount_percent: optionForm.discount_percent || null,
        image_url: optionForm.image_url.trim() || null,
        preview_image_url: optionForm.preview_image_url.trim() || null,
      });
      await load();
      setShowAddOption(false);
      setOptionForm({
        step_id: optionForm.step_id,
        parent_option_id: null,
        label_en: "",
        label_fr: "",
        letter: "A",
        price: 0,
        discount_percent: 0,
        image_url: "",
        preview_image_url: "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm(isFr ? "Supprimer cette option ?" : "Delete this option?")) return;
    setError(null);
    try {
      await deleteConfiguratorOption(id);
      await load();
      setEditingOptionId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleSaveAddon = async () => {
    if (!editingAddonId) return;
    setError(null);
    try {
      await updateConfiguratorAddon(editingAddonId, {
        label_en: addonForm.label_en,
        label_fr: addonForm.label_fr,
        price: addonForm.price,
      });
      await setConfiguratorAddonOptions(editingAddonId, addonsWithOptions[editingAddonId] ?? []);
      await load();
      setEditingAddonId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const toggleAddonOption = (addonId: string, optionId: string) => {
    setAddonsWithOptions((prev) => {
      const arr = prev[addonId] ?? [];
      const next = arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId];
      return { ...prev, [addonId]: next };
    });
  };

  const stepLabelForBar = useCallback(
    (stepKey: string) => {
      if (stepKey === "function") return functionStep ? (isFr ? functionStep.label_fr : functionStep.label_en) : stepKey;
      const stepId = stepIdsForFunction[stepsForFunction.indexOf(stepKey) - 1];
      const meta = stepId ? stepIdToMeta.get(stepId) : null;
      const fallback = STEP_KEYS.find((s) => s.key === stepKey);
      return meta ? (isFr ? meta.label_fr : meta.label_en) : (fallback ? (isFr ? fallback.labelFr : fallback.labelEn) : stepKey);
    },
    [functionStep, isFr, stepIdsForFunction, stepsForFunction, stepIdToMeta]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--logo-green)]">
        <p className="text-white/90">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--logo-green)] text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 bg-[var(--logo-green)] px-6 py-4">
        <Link
          href={`/${locale}/account/admin`}
          className="text-sm font-medium text-white/90 transition hover:text-white"
        >
          ← {isFr ? "Retour admin" : "Back to admin"}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-white/70">
            {isFr ? "Éditer comme" : "Editing as"}
          </span>
          <select
            value={selectedFunctionId ?? ""}
            onChange={(e) => {
              setSelectedFunctionId(e.target.value || null);
              setEditingOptionId(null);
              setShowAddOption(false);
              setEditingFunctionStepsFor(null);
              setEditingAddonId(null);
            }}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white"
          >
            {functionOptions.map((o) => (
              <option key={o.id} value={o.id} className="bg-[var(--logo-green)] text-white">{isFr ? o.label_fr || o.label_en : o.label_en}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Configurator discount – site-wide % off custom builds */}
      <div className="border-b border-white/20 bg-[var(--logo-green)] px-6 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-white">
            {isFr ? "Réduction configurateur (%)" : "Configurator discount (%)"}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={configuratorDiscountPercent}
            onChange={(e) => setConfiguratorDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="w-20 rounded border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white"
          />
          <button
            type="button"
            disabled={configuratorDiscountSaving}
            onClick={async () => {
              setConfiguratorDiscountSaving(true);
              try {
                await setConfiguratorDiscount(configuratorDiscountPercent);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save");
              } finally {
                setConfiguratorDiscountSaving(false);
              }
            }}
            className="rounded border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            {configuratorDiscountSaving ? (isFr ? "Enregistrement…" : "Saving…") : (isFr ? "Enregistrer" : "Save")}
          </button>
          <span className="text-xs text-white/70">
            {isFr ? "Appliqué au total des builds sur mesure au checkout." : "Applied to custom build total at checkout."}
          </span>
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 border-t border-white/20 pt-3 mt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
            <input
              type="checkbox"
              checked={configuratorFreeShipping}
              disabled={configuratorFreeShippingSaving}
              onChange={async (e) => {
                const checked = e.target.checked;
                setConfiguratorFreeShippingState(checked);
                setConfiguratorFreeShippingSaving(true);
                setError(null);
                try {
                  await setConfiguratorFreeShipping(checked);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to save");
                  setConfiguratorFreeShippingState(!checked);
                } finally {
                  setConfiguratorFreeShippingSaving(false);
                }
              }}
              className="rounded border-white/30"
            />
            {isFr ? "Livraison gratuite pour les builds configurateur" : "Free shipping for configurator builds"}
          </label>
          {configuratorFreeShippingSaving && <span className="text-xs text-white/60">{isFr ? "Enregistrement…" : "Saving…"}</span>}
          <span className="text-xs text-white/70">
            {isFr ? "Au checkout Stripe, une ligne « Livraison — Gratuite » sera ajoutée." : "At Stripe checkout, a « Shipping — Free » line will be added."}
          </span>
        </div>
      </div>

      {/* Step bar – same steps and style as customer for selected watch type */}
      <div className="border-b border-white/20 bg-[var(--logo-green)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 md:gap-4">
          {stepsForFunction.map((stepKey, i) => {
            const isActive = currentStepKey === stepKey;
            return (
              <button
                key={stepKey}
                type="button"
                onClick={() => {
                  setCurrentStepKey(stepKey);
                  setEditingOptionId(null);
                  setShowAddOption(false);
                  setEditingFunctionStepsFor(null);
                  setEditingAddonId(null);
                  setShowCreateStep(false);
                }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border-2 transition ${
                    isActive ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-white/40 bg-white/10 text-white/80"
                  }`}
                >
                  <span className="text-xs font-semibold">{i + 1}</span>
                </div>
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    isActive ? "text-white" : "text-white/60"
                  }`}
                >
                  {stepLabelForBar(stepKey)}
                </span>
                {isActive && <div className="h-0.5 w-8 bg-white" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setShowCreateStep((v) => !v);
              setEditingOptionId(null);
              setShowAddOption(false);
              setEditingFunctionStepsFor(null);
              setEditingAddonId(null);
              if (!showCreateStep) setStepForm({ label_en: "", label_fr: "", step_key: "", optional: false, image_url: "" });
            }}
            className="flex flex-col items-center gap-1"
            aria-label={isFr ? "Ajouter une étape" : "Add step"}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border-2 border-dashed border-white/40 bg-white/10 text-white/70 transition hover:border-white hover:bg-white/20 hover:text-white">
              <span className="text-lg font-medium">+</span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-white/60">
              {isFr ? "Nouvelle étape" : "New step"}
            </span>
          </button>
        </div>
        {showCreateStep && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border-2 border-[var(--accent)]/30 bg-white/95 p-6">
            <h3 className="text-lg font-semibold text-foreground">
              {isFr ? "Créer une nouvelle étape" : "Create new step"}
            </h3>
            <p className="mt-1 text-sm text-foreground/60">
              {isFr
                ? "L’étape apparaîtra dans « Étapes » pour chaque type de montre. Donnez une clé unique (ex. custom_rotor)."
                : "The step will appear in « Steps » for each watch type. Use a unique step key (e.g. custom_rotor)."}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-foreground/60">Label (EN)</label>
                <input
                  value={stepForm.label_en}
                  onChange={(e) => setStepForm((p) => ({ ...p, label_en: e.target.value }))}
                  onBlur={(e) => suggestStepKeyFromLabel(e.target.value)}
                  placeholder={isFr ? "ex. Custom Rotor" : "e.g. Custom Rotor"}
                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-foreground/60">Label (FR)</label>
                <input
                  value={stepForm.label_fr}
                  onChange={(e) => setStepForm((p) => ({ ...p, label_fr: e.target.value }))}
                  placeholder={isFr ? "ex. Rotor personnalisé" : "e.g. Custom rotor"}
                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                  {isFr ? "Clé d’étape (unique, ex. custom_rotor)" : "Step key (unique, e.g. custom_rotor)"}
                </label>
                <input
                  value={stepForm.step_key}
                  onChange={(e) => setStepForm((p) => ({ ...p, step_key: e.target.value.replace(/[^a-z0-9_]/gi, "_") }))}
                  placeholder="custom_rotor"
                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="step-optional"
                  checked={stepForm.optional}
                  onChange={(e) => setStepForm((p) => ({ ...p, optional: e.target.checked }))}
                  className="rounded border-foreground/30"
                />
                <label htmlFor="step-optional" className="text-sm text-foreground/80">
                  {isFr ? "Étape optionnelle (le client peut passer)" : "Optional step (customer can skip)"}
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                  {isFr ? "Image de l’étape (URL)" : "Step image (URL)"}
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block max-w-[200px] text-xs text-foreground/70 file:mr-2 file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground"
                    disabled={uploadingStepImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadError(null);
                      setUploadingStepImage(true);
                      try {
                        const fd = new FormData();
                        fd.append("image", file);
                        const { url } = await uploadProductImage(fd);
                        setStepForm((p) => ({ ...p, image_url: url }));
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : "Upload failed");
                      } finally {
                        setUploadingStepImage(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <input
                    value={stepForm.image_url}
                    onChange={(e) => setStepForm((p) => ({ ...p, image_url: e.target.value }))}
                    placeholder={isFr ? "Ou coller une URL" : "Or paste URL"}
                    className="min-w-[200px] flex-1 rounded-lg border border-foreground/20 px-3 py-2 text-sm"
                  />
                </div>
                {uploadingStepImage && <p className="mt-1 text-xs text-foreground/50">{isFr ? "Upload…" : "Uploading…"}</p>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCreateStep}
                disabled={createStepLoading || !stepForm.label_en.trim() || !stepForm.step_key.trim()}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createStepLoading ? "…" : isFr ? "Créer l’étape" : "Create step"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateStep(false);
                  setStepForm({ label_en: "", label_fr: "", step_key: "", optional: false, image_url: "" });
                }}
                className="rounded-lg border border-foreground/20 px-4 py-2 text-sm"
              >
                {isFr ? "Annuler" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:gap-12">
        <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-foreground/10 bg-white/70 shadow-[var(--shadow)] lg:min-h-[420px]">
          <p className="max-w-xs text-center text-sm font-medium uppercase tracking-widest text-foreground/40">
            {isFr ? "Aperçu · Ce que voient les clients" : "Preview · What customers see"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <h2 className="text-2xl font-semibold text-white">
            {isFr ? "Choisissez" : "Select"} {currentStepMeta ? (isFr ? currentStepMeta.labelFr : currentStepMeta.labelEn) : stepLabelForBar(currentStepKey) || currentStepKey}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {currentStepKey === "function"
              ? isFr ? "Types de montres. Cliquez sur une carte pour modifier ou définir les étapes." : "Watch types. Click a card to edit or set steps."
              : isFr ? "Cliquez sur une carte pour modifier. Les options s'affichent comme pour le client." : "Click a card to edit. Options appear as customers see them."}
          </p>
          {currentStepRow && (currentStepRow as { step_key?: string }).step_key !== "function" && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-white/70">{isFr ? "Image de l’étape" : "Step image"}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="block max-w-[180px] text-xs text-white/80 file:mr-2 file:rounded file:border-0 file:bg-white/20 file:px-2 file:py-1 file:text-xs file:text-white"
                  disabled={uploadingStepImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError(null);
                    setUploadingStepImage(true);
                    try {
                      const fd = new FormData();
                      fd.append("image", file);
                      const { url } = await uploadProductImage(fd);
                      setStepImageForm((p) => ({ ...p, image_url: url }));
                    } catch (err) {
                      setUploadError(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setUploadingStepImage(false);
                      e.target.value = "";
                    }
                  }}
                />
                <input
                  value={stepImageForm.image_url}
                  onChange={(e) => setStepImageForm((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-64 rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/50"
                />
                <button
                  type="button"
                  onClick={handleSaveStepImage}
                  disabled={savingStepImage}
                  className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs uppercase tracking-wide text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {savingStepImage ? "…" : isFr ? "Enregistrer" : "Save"}
                </button>
              </div>
              {uploadingStepImage && <span className="text-xs text-white/60">{isFr ? "Upload…" : "Uploading…"}</span>}
              {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
              <button
                type="button"
                onClick={handleDeleteStep}
                disabled={deleteStepLoading}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {deleteStepLoading ? "…" : isFr ? "Supprimer cette étape" : "Delete this step"}
              </button>
            </div>
          )}

          {/* Option cards – same layout as customer; Edit / Steps (function only) / Delete on each */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {optionsForCurrentStep.map((opt) => {
              const isEditing = editingOptionId === opt.id;
              const label = isFr ? (opt.label_fr || opt.label_en) : opt.label_en;
              return (
                <div
                  key={opt.id}
                  className={`flex flex-col items-center rounded-xl border-2 p-4 transition ${
                    isEditing ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]/30" : "border-foreground/20 bg-white/80 shadow-[0_24px_90px_rgba(15,20,23,0.08)]"
                  }`}
                >
                  {(opt as { image_url?: string }).image_url ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-foreground/10">
                      <img
                        src={(opt as { image_url: string }).image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/10 text-lg font-semibold text-foreground/90">
                      {opt.letter}
                    </div>
                  )}
                  <span className="mt-2 block w-full truncate text-center text-sm font-medium text-foreground">{label}</span>
                  <span className="text-sm font-medium text-[var(--accent)]">
                    ${(() => {
                      const p = Number(opt.price);
                      const d = Math.min(100, Math.max(0, Number((opt as { discount_percent?: number }).discount_percent ?? 0)));
                      const effective = d > 0 ? p * (1 - d / 100) : p;
                      return effective.toLocaleString();
                    })()}
                    {((opt as { discount_percent?: number }).discount_percent ?? 0) > 0 && (
                      <span className="ml-1.5 text-xs text-foreground/50 line-through">C${Number(opt.price).toLocaleString()}</span>
                    )}
                  </span>
                  {currentStepKey !== "function" && opt.parent_option_id && (
                    <span className="mt-0.5 text-xs text-foreground/50">
                      {isFr ? "Pour" : "For"}: {functionOptions.find((f) => f.id === opt.parent_option_id)?.label_en ?? ""}
                    </span>
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOptionId(opt.id);
                        setUploadError(null);
                        setOptionForm({
                          step_id: opt.step_id,
                          parent_option_id: opt.parent_option_id,
                          label_en: opt.label_en,
                          label_fr: opt.label_fr,
                          letter: opt.letter,
                          price: opt.price,
                          discount_percent: (opt as { discount_percent?: number }).discount_percent ?? 0,
                          image_url: (opt as { image_url?: string }).image_url ?? "",
                          preview_image_url: (opt as { preview_image_url?: string }).preview_image_url ?? "",
                        });
                        setShowAddOption(false);
                      }}
                      className="rounded-full border border-foreground/20 bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground hover:bg-foreground/5"
                    >
                      {isFr ? "Modifier" : "Edit"}
                    </button>
                    {currentStepKey === "function" && (
                      <button type="button" onClick={() => openEditFunctionSteps(opt.id)} className="rounded-full border border-foreground/20 bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground hover:bg-foreground/5">
                        {isFr ? "Étapes" : "Steps"}
                      </button>
                    )}
                    <button type="button" onClick={() => handleDeleteOption(opt.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      {isFr ? "Suppr." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
              {!functionStep && (
                <p className="mt-4 text-sm text-amber-700">
                  {isFr ? "Créez d’abord l’étape « Function » (step_key = function) dans la base de données." : "Create the Function step (step_key = function) in the database first."}
                </p>
              )}
            {currentStepKey === "function" ? (
              <button
                type="button"
                onClick={() => { if (!functionStep) return; setShowAddOption(true); setEditingOptionId(null); setUploadError(null); setOptionForm({ step_id: functionStep.id, parent_option_id: null, label_en: "", label_fr: "", letter: "A", price: 0, discount_percent: 0, image_url: "", preview_image_url: "" }); }}
                disabled={!functionStep}
                className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-foreground/30 bg-white/60 p-4 text-foreground/60 transition hover:border-foreground/50 hover:bg-white/80 hover:text-foreground/80 disabled:opacity-50"
              >
                <span className="text-2xl">+</span>
                <span className="mt-1 text-sm font-medium">{isFr ? "Type de montre" : "Watch type"}</span>
              </button>
            ) : currentStepRow ? (
              <button
                type="button"
                onClick={() => { setShowAddOption(true); setEditingOptionId(null); setUploadError(null); setOptionForm({ step_id: currentStepRow.id, parent_option_id: selectedFunctionId, label_en: "", label_fr: "", letter: "A", price: 0, discount_percent: 0, image_url: "", preview_image_url: "" }); }}
                className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-foreground/30 bg-white/60 p-4 text-foreground/60 transition hover:border-foreground/50 hover:bg-white/80 hover:text-foreground/80"
              >
                <span className="text-2xl">+</span>
                <span className="mt-1 text-sm font-medium">{isFr ? "Option" : "Option"}</span>
              </button>
            ) : null}
          </div>

          {editingFunctionStepsFor && (
            <div className="mt-8 rounded-xl border-2 border-[var(--accent)]/30 bg-white/90 p-6 text-foreground">
              <h3 className="text-lg font-medium text-foreground">
                {isFr ? "Quelles étapes après la fonction ?" : "Which steps follow for this watch type?"}
              </h3>
              <p className="mt-1 text-sm text-foreground/60">
                {isFr ? "Cochez et réordonnez (↑↓)." : "Check and reorder (↑↓)."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {orderedStepsForFunctionEdit.map((s) => {
                  const checked = functionStepIds.includes(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-full border border-foreground/20 bg-white px-4 py-2 text-foreground">
                        <input type="checkbox" checked={checked} onChange={() => toggleFunctionStep(s.id)} className="rounded border-foreground/30" />
                        <span className="text-sm text-foreground">{s.label_en}</span>
                      </label>
                      {checked && (
                        <>
                          <button type="button" onClick={() => moveFunctionStep(s.id, "up")} className="text-foreground/60 hover:text-foreground" title={isFr ? "Monter" : "Move up"}>↑</button>
                          <button type="button" onClick={() => moveFunctionStep(s.id, "down")} className="text-foreground/60 hover:text-foreground" title={isFr ? "Descendre" : "Move down"}>↓</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={handleSaveFunctionSteps} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white">
                  {isFr ? "Enregistrer" : "Save"}
                </button>
                <button type="button" onClick={() => setEditingFunctionStepsFor(null)} className="rounded-lg border border-foreground/20 px-4 py-2 text-sm">
                  {isFr ? "Annuler" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Case step: Frosted Finish (optional, only for certain colours) */}
          {currentStepKey === "case" && (
            <div className="mt-10 rounded-xl border border-foreground/15 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.06)]">
                  <h3 className="text-lg font-semibold text-foreground">
                    {isFr ? "Fini givré (optionnel)" : "Frosted Finish (optional)"}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    {isFr
                      ? "La seule option facultative. Proposée uniquement pour les couleurs de boîtier cochées ci-dessous."
                      : "The only optional add-on. Shown only for the case colours you check below."}
                  </p>
                  {caseAddons.length === 0 ? (
                    <p className="mt-4 text-sm text-foreground/50">
                      {isFr ? "Aucun add-on. Créez « Frosted Finish » via l’API ou la base de données (configurator_addons, step_id = Case)." : "No add-on. Create « Frosted Finish » via the API or database (configurator_addons, step_id = Case)."}
                    </p>
                  ) : (
                    caseAddons.map((addon) => (
                      <div key={addon.id} className="mt-4">
                        {editingAddonId === addon.id ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-xs uppercase text-foreground/60">Label (EN)</label>
                                <input
                                  value={addonForm.label_en}
                                  onChange={(e) => setAddonForm((p) => ({ ...p, label_en: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2"
                                />
                              </div>
                              <div>
                                <label className="text-xs uppercase text-foreground/60">Label (FR)</label>
                                <input
                                  value={addonForm.label_fr}
                                  onChange={(e) => setAddonForm((p) => ({ ...p, label_fr: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2"
                                />
                              </div>
                              <div>
                                <label className="text-xs uppercase text-foreground/60">Price (CAD)</label>
                                <input
                                  type="number"
                                  value={addonForm.price}
                                  onChange={(e) => setAddonForm((p) => ({ ...p, price: Number(e.target.value) }))}
                                  className="mt-1 w-full rounded-lg border border-foreground/20 px-3 py-2"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs uppercase text-foreground/60">
                                {isFr ? "Proposé pour ces couleurs de boîtier (cochez)" : "Offered for these case colours (check)"}
                              </label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {caseOptions.map((opt) => (
                                  <label
                                    key={opt.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-full border border-foreground/20 bg-white px-3 py-2"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(addonsWithOptions[addon.id] ?? []).includes(opt.id)}
                                      onChange={() => toggleAddonOption(addon.id, opt.id)}
                                      className="rounded border-foreground/30"
                                    />
                                    <span className="text-sm">{opt.label_en}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={handleSaveAddon} className="rounded-lg bg-foreground px-4 py-2 text-sm text-white">
                                {isFr ? "Enregistrer" : "Save"}
                              </button>
                              <button type="button" onClick={() => setEditingAddonId(null)} className="rounded-lg border border-foreground/20 px-4 py-2 text-sm">
                                {isFr ? "Annuler" : "Cancel"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-foreground/10 bg-white p-4">
                            <div>
                              <p className="font-medium">{addon.label_en}</p>
                              <p className="text-sm text-foreground/60">
                                C${addon.price} · {(addonsWithOptions[addon.id] ?? []).length} {isFr ? "couleurs" : "colours"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddonId(addon.id);
                                setAddonForm({
                                  label_en: addon.label_en,
                                  label_fr: addon.label_fr,
                                  price: addon.price,
                                });
                              }}
                              className="rounded-full border border-foreground/20 bg-white px-4 py-2 text-xs font-medium uppercase text-foreground"
                            >
                              {isFr ? "Modifier" : "Edit"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

          {/* Add/Edit option form (shared for Function and other steps) */}
          {(showAddOption || editingOptionId) && (
            <div className="mt-8 rounded-xl border-2 border-[var(--accent)]/30 bg-white p-6 text-foreground">
              <h3 className="text-lg font-semibold text-foreground">
                {editingOptionId ? (isFr ? "Modifier l’option" : "Edit option") : currentStepKey === "function" ? (isFr ? "Nouveau type de montre" : "New watch type") : (isFr ? "Nouvelle option" : "New option")}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">Label (EN)</label>
                  <input
                    value={optionForm.label_en}
                    onChange={(e) => setOptionForm((p) => ({ ...p, label_en: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground placeholder:text-neutral-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">Label (FR)</label>
                  <input
                    value={optionForm.label_fr}
                    onChange={(e) => setOptionForm((p) => ({ ...p, label_fr: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground placeholder:text-neutral-500"
                  />
                </div>
                {currentStepKey !== "function" && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-foreground">{isFr ? "Pour fonction (vide = toutes)" : "For function (empty = all)"}</label>
                    <select
                      value={optionForm.parent_option_id ?? ""}
                      onChange={(e) => setOptionForm((p) => ({ ...p, parent_option_id: e.target.value || null }))}
                      className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground"
                    >
                      <option value="">— {isFr ? "Toutes" : "All"}</option>
                      {functionOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label_en}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">Letter</label>
                  <input
                    value={optionForm.letter}
                    onChange={(e) => setOptionForm((p) => ({ ...p, letter: e.target.value.slice(0, 1) }))}
                    maxLength={1}
                    className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground placeholder:text-neutral-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">Price (CAD)</label>
                  <input
                    type="number"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm((p) => ({ ...p, price: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground placeholder:text-neutral-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">{isFr ? "Réduction (%)" : "Discount (%)"}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={optionForm.discount_percent}
                    onChange={(e) => setOptionForm((p) => ({ ...p, discount_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-foreground/25 bg-white px-3 py-2 text-foreground placeholder:text-neutral-500"
                  />
                  <p className="mt-0.5 text-xs text-foreground/60">{isFr ? "Optionnel. Réduit le prix de cette option." : "Optional. Reduces this option's price."}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">{isFr ? "Image" : "Image"}</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="block max-w-[180px] text-xs text-foreground file:mr-2 file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground"
                      disabled={uploadingOptionImage !== null}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadError(null);
                        setUploadingOptionImage("image");
                        try {
                          const fd = new FormData();
                          fd.append("image", file);
                          const { url } = await uploadProductImage(fd);
                          setOptionForm((p) => ({ ...p, image_url: url }));
                        } catch (err) {
                          setUploadError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingOptionImage(null);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={optionForm.image_url}
                      onChange={(e) => setOptionForm((p) => ({ ...p, image_url: e.target.value }))}
                      placeholder={isFr ? "Ou URL" : "Or URL"}
                      className="min-w-[200px] flex-1 rounded-lg border border-foreground/25 bg-white px-3 py-2 text-sm text-foreground placeholder:text-neutral-500"
                    />
                  </div>
                  {uploadingOptionImage === "image" && <p className="mt-1 text-xs text-foreground/60">{isFr ? "Upload…" : "Uploading…"}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-foreground">{isFr ? "Image aperçu" : "Preview image"}</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="block max-w-[180px] text-xs text-foreground file:mr-2 file:rounded file:border-0 file:bg-foreground/10 file:px-2 file:py-1 file:text-xs file:text-foreground"
                      disabled={uploadingOptionImage !== null}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadError(null);
                        setUploadingOptionImage("preview");
                        try {
                          const fd = new FormData();
                          fd.append("image", file);
                          const { url } = await uploadProductImage(fd);
                          setOptionForm((p) => ({ ...p, preview_image_url: url }));
                        } catch (err) {
                          setUploadError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploadingOptionImage(null);
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      value={optionForm.preview_image_url}
                      onChange={(e) => setOptionForm((p) => ({ ...p, preview_image_url: e.target.value }))}
                      placeholder={isFr ? "Ou URL" : "Or URL"}
                      className="min-w-[200px] flex-1 rounded-lg border border-foreground/25 bg-white px-3 py-2 text-sm text-foreground placeholder:text-neutral-500"
                    />
                  </div>
                  {uploadingOptionImage === "preview" && <p className="mt-1 text-xs text-foreground/60">{isFr ? "Upload…" : "Uploading…"}</p>}
                </div>
                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={editingOptionId ? handleSaveOption : handleAddOption}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white"
                >
                  {editingOptionId ? (isFr ? "Enregistrer" : "Save") : (isFr ? "Créer" : "Create")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingOptionId(null);
                    setShowAddOption(false);
                  }}
                  className="rounded-lg border border-foreground/25 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
                >
                  {isFr ? "Annuler" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {currentStepKey !== "function" && !currentStepRow && (
            <p className="mt-6 text-sm text-foreground/50">
              {isFr ? "Cette étape n’existe pas encore en base. Créez-la (step_key = " : "This step does not exist in the database yet. Create it (step_key = "}
              <code className="rounded bg-foreground/10 px-1">{currentStepKey}</code>
              {isFr ? ") dans configurator_steps." : ") in configurator_steps."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
