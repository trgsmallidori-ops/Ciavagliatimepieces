"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import AdminImageEditor from "@/components/admin/AdminImageEditor";
import {
  getAdminGiveaway,
  getAdminOrders,
  upsertGiveaway,
  removeGiveaway,
  uploadProductImage,
} from "../actions";
import type { GiveawayRow, OrderRow } from "../actions";

type PriceSort = "high" | "low" | null;

export default function AdminGiveawayPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [giveaway, setGiveaway] = useState<GiveawayRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [priceSort, setPriceSort] = useState<PriceSort>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    image_url: string;
    link_url: string;
    active: boolean;
  }>({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    active: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropModalImageSource, setCropModalImageSource] = useState<string | null>(null);
  const [cropModalOnSave, setCropModalOnSave] = useState<((url: string) => void) | null>(null);

  const openCropModal = useCallback((file: File, onSave: (url: string) => void) => {
    setCropModalImageSource(URL.createObjectURL(file));
    setCropModalOnSave(() => onSave);
    setCropModalOpen(true);
    setImageError(null);
  }, []);

  const closeCropModal = useCallback(() => {
    setCropModalOpen(false);
    if (cropModalImageSource) URL.revokeObjectURL(cropModalImageSource);
    setCropModalImageSource(null);
    setCropModalOnSave(null);
  }, [cropModalImageSource]);

  const handleCropSave = useCallback(
    (url: string) => {
      cropModalOnSave?.(url);
      closeCropModal();
    },
    [cropModalOnSave, closeCropModal]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [g, o] = await Promise.all([getAdminGiveaway(), getAdminOrders()]);
        setGiveaway(g);
        setOrders(o);
        if (g) {
          setForm({
            title: g.title ?? "",
            description: g.description ?? "",
            image_url: g.image_url ?? "",
            link_url: g.link_url ?? "",
            active: g.active,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sortedOrders = useMemo(() => {
    const list = [...orders];
    if (priceSort === "high") {
      list.sort((a, b) => Number(b.total) - Number(a.total));
    } else if (priceSort === "low") {
      list.sort((a, b) => Number(a.total) - Number(b.total));
    }
    return list;
  }, [orders, priceSort]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await upsertGiveaway({
        title: form.title || null,
        description: form.description || null,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        active: form.active,
      });
      const g = await getAdminGiveaway();
      setGiveaway(g ?? null);
      if (g) {
        setForm({
          title: g.title ?? "",
          description: g.description ?? "",
          image_url: g.image_url ?? "",
          link_url: g.link_url ?? "",
          active: g.active,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(isFr ? "Retirer le concours de la page d'accueil et effacer le contenu ?" : "Remove the giveaway from the homepage and clear its content?")) return;
    setError(null);
    setRemoving(true);
    try {
      await removeGiveaway();
      const g = await getAdminGiveaway();
      setGiveaway(g ?? null);
      setForm({
        title: g?.title ?? "",
        description: g?.description ?? "",
        image_url: g?.image_url ?? "",
        link_url: g?.link_url ?? "",
        active: g?.active ?? false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  const hasGiveaway = giveaway?.active || form.title || form.description || form.image_url;

  const displayName = (order: OrderRow) =>
    order.shipping_name?.trim() || order.customer_email || "—";

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-white/90">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error && !giveaway && orders.length === 0) {
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
        <div>
          <h1 className="text-3xl font-semibold text-white">{isFr ? "Concours" : "Giveaway"}</h1>
          <p className="mt-1 text-white/90">
            {isFr
              ? "Annoncez un concours : il apparaîtra en tête de la page d'accueil. Consultez les achats par montant."
              : "Announce a giveaway and it will appear at the top of the homepage. View customers who bought, by amount."}
          </p>
        </div>
      </ScrollReveal>

      {error && (
        <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ScrollReveal>
        <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
          <h2 className="text-xl font-medium">
            {isFr ? "Annoncer le concours" : "Announce giveaway"}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {isFr ? "Titre" : "Title"}
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={isFr ? "Ex. Concours d'été" : "e.g. Summer giveaway"}
                className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {isFr ? "Description" : "Description"}
              </label>
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
                {isFr ? "Image" : "Image"}
              </label>
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropModal(file, (url) => setForm((p) => ({ ...p, image_url: url })));
                      e.target.value = "";
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
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {isFr ? "Lien (bouton)" : "Link (button)"}
              </label>
              <input
                value={form.link_url}
                onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
                placeholder={locale === "fr" ? "/fr/shop" : "/en/shop"}
                className="mt-2 w-full rounded-full border border-foreground/20 bg-white px-4 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="giveaway-active"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="h-4 w-4 rounded border-foreground/30"
              />
              <label htmlFor="giveaway-active" className="text-sm">
                {isFr
                  ? "Concours actif (affiché sur la page d'accueil)"
                  : "Giveaway active (shown on homepage)"}
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-hover rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white disabled:opacity-50"
            >
              {saving
                ? isFr
                  ? "Enregistrement…"
                  : "Saving…"
                : isFr
                  ? "Enregistrer"
                  : "Save"}
            </button>
            {hasGiveaway && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="btn-hover rounded-full border border-red-200 px-6 py-3 text-xs uppercase tracking-[0.3em] text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {removing
                  ? isFr
                    ? "Suppression…"
                    : "Removing…"
                  : isFr
                    ? "Retirer le concours"
                    : "Remove giveaway"}
              </button>
            )}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div>
          <h2 className="text-xl font-medium text-white">
            {isFr ? "Achats (participants)" : "Purchases (eligible customers)"}
          </h2>
          <p className="mt-1 text-sm text-white/90">
            {isFr
              ? "Personnes ayant passé commande, avec montant. Triez par prix."
              : "People who placed orders, with amount. Sort by price."}
          </p>
          <div className="mt-4 overflow-x-auto rounded-[28px] border border-white/70 bg-white/80 text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            {orders.length === 0 ? (
              <div className="p-10 text-center text-foreground/60">
                {isFr ? "Aucune commande." : "No orders yet."}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-foreground/60">
                    {isFr ? "Trier par prix" : "Sort by price"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPriceSort(priceSort === "high" ? null : "high")}
                    className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] ${
                      priceSort === "high"
                        ? "bg-foreground text-white"
                        : "border border-foreground/20 text-foreground/70 hover:border-foreground/40"
                    }`}
                  >
                    {isFr ? "Prix élevé → bas" : "Price high → low"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceSort(priceSort === "low" ? null : "low")}
                    className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] ${
                      priceSort === "low"
                        ? "bg-foreground text-white"
                        : "border border-foreground/20 text-foreground/70 hover:border-foreground/40"
                    }`}
                  >
                    {isFr ? "Prix bas → élevé" : "Price low → high"}
                  </button>
                  {priceSort && (
                    <button
                      type="button"
                      onClick={() => setPriceSort(null)}
                      className="text-xs text-foreground/50 hover:underline"
                    >
                      {isFr ? "Réinitialiser" : "Reset"}
                    </button>
                  )}
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10">
                      <th className="p-4 font-semibold">{isFr ? "Nom" : "Name"}</th>
                      <th className="p-4 font-semibold">{isFr ? "E-mail" : "Email"}</th>
                      <th className="p-4 font-semibold">
                        {isFr ? "Montant" : "Amount"}
                        {priceSort === "high" && " ↓"}
                        {priceSort === "low" && " ↑"}
                      </th>
                      <th className="p-4 font-semibold">{isFr ? "Date" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((order) => (
                      <tr key={order.id} className="border-b border-foreground/5">
                        <td className="p-4 text-foreground/90">{displayName(order)}</td>
                        <td className="p-4 text-foreground/80">{order.customer_email ?? "—"}</td>
                        <td className="p-4 font-medium">
                          ${Number(order.total).toLocaleString()}
                        </td>
                        <td className="p-4 text-foreground/80">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </ScrollReveal>

      <AdminImageEditor
        open={cropModalOpen}
        onClose={closeCropModal}
        imageSource={cropModalImageSource}
        onSave={handleCropSave}
        onUpload={uploadProductImage}
        label={isFr ? "Image concours" : "Giveaway image"}
        locale={locale}
      />
    </div>
  );
}
