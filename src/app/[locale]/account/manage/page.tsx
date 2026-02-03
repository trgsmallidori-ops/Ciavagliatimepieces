"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import { createBrowserClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  preferences: string | null;
};

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  summary: string | null;
};

function emptyProfile(): Profile {
  return {
    full_name: null,
    phone: null,
    shipping_address: null,
    city: null,
    country: null,
    postal_code: null,
    preferences: null,
  };
}

export default function ManageAccountPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Profile>(emptyProfile());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/account/login`;
        return;
      }

      setUserId(user.id);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: orderData } = await supabase
        .from("orders")
        .select("id,total,status,created_at,summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const p = profileData ?? null;
      setProfile(p);
      setEditForm(
        p ?? {
          full_name: null,
          phone: null,
          shipping_address: null,
          city: null,
          country: null,
          postal_code: null,
          preferences: null,
        }
      );
      setOrders(orderData ?? []);
      setLoading(false);
    };

    load();
  }, [locale]);

  const startEditing = () => {
    setEditForm(profile ?? emptyProfile());
    setSaveError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError(null);
  };

  const updateEditField = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: editForm.full_name || null,
        phone: editForm.phone || null,
        shipping_address: editForm.shipping_address || null,
        city: editForm.city || null,
        country: editForm.country || null,
        postal_code: editForm.postal_code || null,
        preferences: editForm.preferences || null,
      })
      .eq("id", userId);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setProfile({ ...editForm });
    setEditing(false);
    setSaving(false);
  };

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <ScrollReveal>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">{isFr ? "Compte" : "Account"}</p>
            <h1 className="mt-4 text-4xl">
              {isFr ? "Votre tableau de bord." : "Your dashboard."}
            </h1>
            <p className="mt-4 text-foreground/70">
              {isFr
                ? "Gérez vos configurations, livraisons et commandes."
                : "Review your saved configurations, shipping details, and order history in one place."}
            </p>
          </div>
        </ScrollReveal>
        {loading ? (
          <ScrollReveal>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6">
              {isFr ? "Chargement..." : "Loading profile..."}
            </div>
          </ScrollReveal>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <ScrollReveal>
                <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-2xl">{isFr ? "Profil" : "Profile details"}</h2>
                    {!editing && (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="btn-hover rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
                      >
                        {isFr ? "Modifier" : "Edit"}
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                          {isFr ? "Nom complet" : "Full name"}
                        </label>
                        <input
                          value={editForm.full_name ?? ""}
                          onChange={(e) => updateEditField("full_name", e.target.value)}
                          className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                          {isFr ? "Téléphone" : "Phone"}
                        </label>
                        <input
                          value={editForm.phone ?? ""}
                          onChange={(e) => updateEditField("phone", e.target.value)}
                          className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                          {isFr ? "Adresse de livraison" : "Shipping address"}
                        </label>
                        <input
                          value={editForm.shipping_address ?? ""}
                          onChange={(e) => updateEditField("shipping_address", e.target.value)}
                          className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                            {isFr ? "Ville" : "City"}
                          </label>
                          <input
                            value={editForm.city ?? ""}
                            onChange={(e) => updateEditField("city", e.target.value)}
                            className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                            {isFr ? "Pays" : "Country"}
                          </label>
                          <input
                            value={editForm.country ?? ""}
                            onChange={(e) => updateEditField("country", e.target.value)}
                            className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                            {isFr ? "Code postal" : "Postal code"}
                          </label>
                          <input
                            value={editForm.postal_code ?? ""}
                            onChange={(e) => updateEditField("postal_code", e.target.value)}
                            className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                            {isFr ? "Préférences" : "Preferences"}
                          </label>
                          <input
                            value={editForm.preferences ?? ""}
                            onChange={(e) => updateEditField("preferences", e.target.value)}
                            placeholder={isFr ? "Couleur, bracelet, gravure" : "Case tone, strap style, engraving"}
                            className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                          />
                        </div>
                      </div>
                      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white disabled:opacity-70"
                        >
                          {saving ? (isFr ? "Enregistrement..." : "Saving...") : isFr ? "Enregistrer" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                          className="btn-hover rounded-full border border-foreground/20 px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground/80 transition hover:border-foreground hover:text-foreground disabled:opacity-70"
                        >
                          {isFr ? "Annuler" : "Cancel"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 grid gap-2 text-sm text-foreground/70">
                      <p>{isFr ? "Nom" : "Name"}: {profile?.full_name ?? "Not set"}</p>
                      <p>{isFr ? "Téléphone" : "Phone"}: {profile?.phone ?? "Not set"}</p>
                      <p>
                        {isFr ? "Adresse" : "Address"}: {profile?.shipping_address ?? "Not set"}
                        {profile?.city || profile?.postal_code ? `, ${profile?.city ?? ""} ${profile?.postal_code ?? ""}` : ""}
                      </p>
                      <p>{isFr ? "Pays" : "Country"}: {profile?.country ?? "Not set"}</p>
                      <p>{isFr ? "Préférences" : "Preferences"}: {profile?.preferences ?? "Not set"}</p>
                    </div>
                  )}
                </div>
              </ScrollReveal>
              <ScrollReveal>
                <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
                  <h2 className="text-2xl">{isFr ? "Configurations" : "Saved configurations"}</h2>
                  <p className="mt-3 text-foreground/70">
                    {isFr
                      ? "Vos configurations apparaissent ici après création."
                      : "Your configurations appear here after you build them in the configurator."}
                  </p>
                </div>
              </ScrollReveal>
            </div>
            <ScrollReveal>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
                <h2 className="text-2xl">{isFr ? "Commandes" : "Order history"}</h2>
                <div className="mt-4 space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-foreground/70">{isFr ? "Aucune commande." : "No orders yet."}</p>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="rounded-[20px] border border-foreground/10 bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        <p className="mt-2 text-sm text-foreground/70">{order.summary ?? "Custom Ciavaglia order"}</p>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="uppercase tracking-[0.2em] text-foreground/60">{order.status}</span>
                          <span className="font-semibold">${order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </section>
  );
}
