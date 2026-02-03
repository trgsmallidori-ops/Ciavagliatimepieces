"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  getConfiguratorSteps,
  getConfiguratorOptions,
  getConfiguratorAddons,
  type ConfiguratorStepRow,
  type ConfiguratorOptionRow,
  type ConfiguratorAddonWithOptionsRow,
} from "@/app/[locale]/account/admin/actions";

export default function Configurator({ locale }: { locale: string }) {
  const isFr = locale === "fr";
  const [steps, setSteps] = useState<ConfiguratorStepRow[]>([]);
  const [optionsByStep, setOptionsByStep] = useState<Record<number, ConfiguratorOptionRow[]>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [addonsList, setAddonsList] = useState<ConfiguratorAddonWithOptionsRow[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepsLoaded, setStepsLoaded] = useState(false);
  const [totalExpanded, setTotalExpanded] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const currentStep = steps[stepIndex];
  const isExtraStep = currentStep?.label_en?.toLowerCase() === "extra";
  const parentOptionId = stepIndex === 0 ? null : selectedIds[0];

  const loadSteps = useCallback(async () => {
    try {
      const data = await getConfiguratorSteps();
      setSteps(data);
      setSelectedIds(data.map(() => null));
      setStepsLoaded(true);
    } catch {
      setStepsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSteps();
  }, [loadSteps]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConfiguratorAddons();
        setAddonsList(data);
      } catch {
        setAddonsList([]);
      }
    };
    if (stepsLoaded) load();
  }, [stepsLoaded]);

  useEffect(() => {
    if (!currentStep) return;
    const loadOptions = async () => {
      const opts = await getConfiguratorOptions(currentStep.id, parentOptionId);
      setOptionsByStep((prev) => ({ ...prev, [stepIndex]: opts }));
    };
    loadOptions();
  }, [currentStep?.id, parentOptionId, stepIndex]);

  // When selection changes, clear add-ons that are no longer available for this step
  useEffect(() => {
    if (!currentStep) return;
    const selectedOptionId = selectedIds[stepIndex];
    setSelectedAddonIds((prev) =>
      prev.filter((addonId) => {
        const addon = addonsList.find((a) => a.id === addonId);
        if (!addon || addon.step_id !== currentStep.id) return true;
        return addon.option_ids.includes(selectedOptionId ?? "");
      })
    );
  }, [currentStep?.id, stepIndex, selectedIds, addonsList]);

  const options = optionsByStep[stepIndex] ?? [];

  const setSelection = useCallback((optionId: string | null) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[stepIndex] = optionId;
      if (stepIndex === 0) {
        for (let i = 1; i < next.length; i++) next[i] = null;
      }
      return next;
    });
  }, [stepIndex]);

  const total = useMemo(() => {
    let t = 0;
    steps.forEach((s, i) => {
      const opts = optionsByStep[i] ?? [];
      const isStepExtra = s.label_en?.toLowerCase() === "extra";
      if (isStepExtra) {
        extraIds.forEach((id) => {
          const o = opts.find((x) => x.id === id);
          if (o) t += Number(o.price);
        });
      } else {
        const sid = selectedIds[i];
        if (sid) {
          const o = opts.find((x) => x.id === sid);
          if (o) t += Number(o.price);
        }
      }
    });
    selectedAddonIds.forEach((addonId) => {
      const addon = addonsList.find((a) => a.id === addonId);
      if (addon) t += Number(addon.price);
    });
    return t;
  }, [steps, optionsByStep, selectedIds, extraIds, selectedAddonIds, addonsList]);

  const canContinue = useCallback(() => {
    if (isExtraStep) return true;
    return !!selectedIds[stepIndex];
  }, [stepIndex, selectedIds, isExtraStep]);

  const handleContinue = () => {
    if (stepIndex < steps.length - 1) setStepIndex((s) => s + 1);
    else handleReviewOrder();
  };

  const handleReviewOrder = async () => {
    setCheckoutError(null);
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          type: "custom",
          userId: user?.id ?? null,
          configuration: {
            steps: selectedIds,
            extras: extraIds,
            addonIds: selectedAddonIds,
            price: total,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data?.error ?? (isFr ? "Échec du passage en caisse." : "Checkout failed. Please try again."));
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(isFr ? "Réponse inattendue. Réessayez." : "Unexpected response. Please try again.");
      }
    } catch {
      setCheckoutError(isFr ? "Erreur réseau. Vérifiez votre connexion et réessayez." : "Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStepIndex(0);
    setSelectedIds(steps.map(() => null));
    setExtraIds([]);
    setSelectedAddonIds([]);
  };

  const totalLineItems = useMemo(() => {
    const lines: { label: string; price: number }[] = [];
    steps.forEach((s, i) => {
      const opts = optionsByStep[i] ?? [];
      const isStepExtra = s.label_en?.toLowerCase() === "extra";
      const stepLabel = isFr ? s.label_fr : s.label_en;
      if (isStepExtra) {
        extraIds.forEach((id) => {
          const o = opts.find((x) => x.id === id);
          if (o) lines.push({ label: `${stepLabel}: ${isFr ? o.label_fr : o.label_en}`, price: Number(o.price) });
        });
      } else {
        const sid = selectedIds[i];
        if (sid) {
          const o = opts.find((x) => x.id === sid);
          if (o) lines.push({ label: `${stepLabel}: ${isFr ? o.label_fr : o.label_en}`, price: Number(o.price) });
        }
      }
    });
    selectedAddonIds.forEach((addonId) => {
      const addon = addonsList.find((a) => a.id === addonId);
      if (addon) lines.push({ label: isFr ? addon.label_fr : addon.label_en, price: Number(addon.price) });
    });
    return lines;
  }, [steps, optionsByStep, selectedIds, extraIds, selectedAddonIds, addonsList, isFr]);

  const selectedOptionForPreview = useMemo(() => {
    if (isExtraStep && extraIds.length > 0) {
      const opts = optionsByStep[stepIndex] ?? [];
      const first = opts.find((x) => x.id === extraIds[0]);
      return first?.preview_image_url || first?.image_url;
    }
    const sid = selectedIds[stepIndex];
    if (!sid) return null;
    const opts = optionsByStep[stepIndex] ?? [];
    const o = opts.find((x) => x.id === sid);
    return o?.preview_image_url || o?.image_url || null;
  }, [stepIndex, selectedIds, extraIds, isExtraStep, optionsByStep]);

  if (!stepsLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-foreground">
        <p>{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <p className="text-center">{isFr ? "Aucune étape configurée. Ajoutez des étapes et options dans l’admin." : "No configurator steps set up. Add steps and options in the admin."}</p>
        <Link href={`/${locale}/account/admin/configurator`} className="btn-hover rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-strong">
          {isFr ? "Aller à l’admin" : "Go to admin"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-foreground/10 bg-white/60 px-6 py-4 shadow-sm">
        <Link href={`/${locale}`} className="text-lg font-medium text-accent transition hover:text-accent-strong">
          Ciavaglia Timepieces
        </Link>
        <button
          type="button"
          onClick={handleStartOver}
          className="btn-hover flex items-center gap-2 text-sm text-foreground/70 transition hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isFr ? "Recommencer" : "Start Over"}
        </button>
      </div>

      <div className="border-b-2 border-foreground/20 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 md:gap-4">
          {steps.map((s, i) => {
            const isCompleted = stepIndex > i || (stepIndex === i && (i === 0 ? selectedIds[0] : true));
            const isActive = stepIndex === i;
            const label = isFr ? s.label_fr : s.label_en;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isCompleted
                      ? "border-accent bg-accent text-white"
                      : isActive
                        ? "border-accent bg-accent text-white"
                        : "border-foreground/35 bg-foreground/10 text-foreground/80"
                  }`}
                >
                  {isCompleted && stepIndex > i ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-semibold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    isActive ? "text-accent" : isCompleted && stepIndex > i ? "text-foreground/70" : "text-foreground/80"
                  }`}
                >
                  {label}
                </span>
                {isActive && <div className="h-0.5 w-full bg-accent" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:gap-12">
        <div className="relative aspect-square max-h-[420px] w-full overflow-hidden rounded-[var(--radius-xl)] border-2 border-foreground/20 bg-white shadow-[var(--shadow)] lg:max-w-[420px]">
          {selectedOptionForPreview ? (
            <Image
              src={selectedOptionForPreview}
              alt=""
              fill
              className="object-contain"
              sizes="420px"
              unoptimized={selectedOptionForPreview.startsWith("http")}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-foreground/50">
              <span className="text-sm font-medium uppercase tracking-widest">
                {isFr ? "Aperçu montre" : "Watch preview"}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {currentStep && (
            <>
              <h2 className="text-2xl font-medium text-foreground">
                {isFr ? "Choisissez" : "Select"} {isFr ? currentStep.label_fr : currentStep.label_en}
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                {options.length} {isFr ? "options" : "options available"}
                {isExtraStep ? ` • ${isFr ? "Optionnel" : "Optional"}` : ""}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {options.map((opt) => {
                  const selected = isExtraStep ? extraIds.includes(opt.id) : selectedIds[stepIndex] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isExtraStep) {
                          setExtraIds((prev) =>
                            prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                          );
                        } else {
                          setSelection(opt.id);
                        }
                      }}
                      className={`btn-hover flex flex-col items-center rounded-[22px] border-2 p-4 text-left transition shadow-md ${
                        selected ? "border-accent bg-accent/20 ring-2 ring-accent/50 ring-offset-2 ring-offset-background" : "border-foreground/30 bg-white hover:border-foreground/50 hover:shadow-lg"
                      }`}
                    >
                      <div className="relative">
                        {opt.image_url ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-full">
                            <Image
                              src={opt.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized={opt.image_url.startsWith("http")}
                            />
                          </div>
                        ) : (
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold ${
                              selected ? "bg-accent text-white" : "bg-surface-strong text-foreground/80"
                            }`}
                          >
                            {opt.letter}
                          </div>
                        )}
                        {selected && (
                          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground shadow-md ring-2 ring-white">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="mt-2 block w-full truncate text-center text-sm font-medium text-foreground">
                        {isFr ? opt.label_fr : opt.label_en}
                      </span>
                      <span className={`text-sm font-medium ${selected ? "text-accent-strong" : "text-foreground/70"}`}>
                        ${Number(opt.price).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {addonsList
                .filter((a) => a.step_id === currentStep.id)
                .map((addon) => {
                  const selectedOptionId = selectedIds[stepIndex];
                  const available = !!selectedOptionId && addon.option_ids.includes(selectedOptionId);
                  const selected = selectedAddonIds.includes(addon.id);
                  const selectedOption = options.find((o) => o.id === selectedOptionId);
                  const selectedOptionLabel = selectedOption ? (isFr ? selectedOption.label_fr : selectedOption.label_en) : "";
                  const availableLabels = options
                    .filter((o) => addon.option_ids.includes(o.id))
                    .map((o) => (isFr ? o.label_fr : o.label_en))
                    .join(", ");
                  return (
                    <div key={addon.id} className="mt-6 flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`addon-${addon.id}`}
                          checked={selected}
                          disabled={!available}
                          onChange={() => {
                            if (!available) return;
                            setSelectedAddonIds((prev) =>
                              prev.includes(addon.id) ? prev.filter((x) => x !== addon.id) : [...prev, addon.id]
                            );
                          }}
                          className="mt-1 h-4 w-4 rounded border-foreground/30 text-accent focus:ring-accent disabled:opacity-50"
                        />
                        <label htmlFor={`addon-${addon.id}`} className={`text-sm ${available ? "text-foreground/80 cursor-pointer" : "text-foreground/50 cursor-not-allowed"}`}>
                          {isFr ? addon.label_fr : addon.label_en} ({isFr ? "optionnel" : "Optional"}) · ${Number(addon.price).toLocaleString()}
                          <br />
                          <span className="text-xs text-foreground/50">
                            {available
                              ? (availableLabels ? (isFr ? `Disponible pour ${availableLabels}.` : `Available for ${availableLabels}.`) : (isFr ? "Optionnel" : "Optional"))
                              : (selectedOptionLabel ? (isFr ? `Non disponible pour ${selectedOptionLabel}.` : `Not available for ${selectedOptionLabel}.`) : (isFr ? "Choisissez une option ci-dessus." : "Select an option above."))}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}

              {checkoutError && (
                <div className="mt-6 rounded-[22px] border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {checkoutError}
                </div>
              )}

              <div className="mt-10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                  disabled={stepIndex === 0}
                  className="btn-hover rounded-[22px] border-2 border-foreground/40 bg-white px-5 py-2.5 text-sm font-medium text-foreground shadow-md transition hover:bg-surface-strong hover:border-foreground/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← {isFr ? "Retour" : "Back"}
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  className="btn-hover rounded-[22px] border-2 border-foreground bg-white px-6 py-2.5 text-sm font-bold text-foreground shadow-lg ring-2 ring-foreground/30 ring-offset-2 ring-offset-background transition hover:bg-foreground hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:ring-0"
                >
                  {stepIndex < steps.length - 1
                    ? `${isFr ? "Continuer" : "Continue"} →`
                    : isFr
                      ? "Vérifier la commande →"
                      : "Review Order →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-10 w-[min(20rem,calc(100vw-3rem))]">
        <button
          type="button"
          onClick={() => setTotalExpanded((e) => !e)}
          className="btn-hover flex w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] border-2 border-foreground/25 bg-white px-4 py-3 shadow-lg backdrop-blur-sm transition hover:border-foreground/40 hover:shadow-xl"
          aria-expanded={totalExpanded}
          aria-label={totalExpanded ? (isFr ? "Réduire le total" : "Collapse total") : (isFr ? "Voir le détail du total" : "View total breakdown")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/25">
              <svg className="h-4 w-4 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">{isFr ? "Total" : "Total"}</p>
              <p className="text-xl font-bold text-foreground">${total.toLocaleString()}</p>
            </div>
          </div>
          <svg
            className={`h-5 w-5 shrink-0 text-foreground/70 transition-transform ${totalExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {totalExpanded && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-[22px] border-2 border-foreground/20 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
              {isFr ? "Détail" : "Breakdown"}
            </p>
            {totalLineItems.length === 0 ? (
              <p className="text-sm text-foreground/60">{isFr ? "Aucune sélection." : "No selections yet."}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {totalLineItems.map((item, idx) => (
                  <li key={idx} className="flex justify-between gap-2 border-b border-foreground/10 pb-1.5 last:border-0">
                    <span className="truncate text-foreground/90">{item.label}</span>
                    <span className="shrink-0 font-medium text-foreground">${item.price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-between border-t-2 border-foreground/20 pt-2 text-sm font-bold text-foreground">
              <span>{isFr ? "Total" : "Total"}</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
