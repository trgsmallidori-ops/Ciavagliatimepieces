"use client";

import { useEffect, useState } from "react";
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

export default function ManageAccountPage({ params }: { params: { locale: string } }) {
  const isFr = params.locale === "fr";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${params.locale}/account/login`;
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: orderData } = await supabase
        .from("orders")
        .select("id,total,status,created_at,summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setProfile(profileData ?? null);
      setOrders(orderData ?? []);
      setLoading(false);
    };

    load();
  }, [params.locale]);

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl space-y-10">
        <ScrollReveal>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">{isFr ? "Compte" : "Account"}</p>
            <h1 className="mt-4 text-4xl">
              {isFr ? "Votre tableau de bord." : "Your atelier dashboard."}
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
                  <h2 className="text-2xl">{isFr ? "Profil" : "Profile details"}</h2>
                  <div className="mt-4 grid gap-2 text-sm text-foreground/70">
                    <p>{isFr ? "Nom" : "Name"}: {profile?.full_name ?? "Not set"}</p>
                    <p>{isFr ? "Téléphone" : "Phone"}: {profile?.phone ?? "Not set"}</p>
                    <p>
                      {isFr ? "Adresse" : "Address"}: {profile?.shipping_address ?? "Not set"}, {profile?.city ?? ""} {profile?.postal_code ?? ""}
                    </p>
                    <p>{isFr ? "Pays" : "Country"}: {profile?.country ?? "Not set"}</p>
                    <p>{isFr ? "Préférences" : "Preferences"}: {profile?.preferences ?? "Not set"}</p>
                  </div>
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
                        <p className="mt-2 text-sm text-foreground/70">{order.summary ?? "Custom Civaglia order"}</p>
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
