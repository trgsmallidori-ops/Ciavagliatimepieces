"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { createBrowserClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const router = useRouter();
  const isFr = locale === "fr";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    shippingAddress: "",
    city: "",
    country: "",
    postalCode: "",
    preferences: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            phone: form.phone,
          },
          emailRedirectTo: siteUrl ? `${siteUrl.replace(/\/$/, "")}/${locale}/account/manage` : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: form.fullName,
          phone: form.phone,
          shipping_address: form.shippingAddress,
          city: form.city,
          country: form.country,
          postal_code: form.postalCode,
          preferences: form.preferences,
        });
      }

      // Session is set by signUp when email confirmation is disabled; refresh so the app sees it
      router.refresh();
      router.push(`/${locale}/account/manage`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-6">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <ScrollReveal>
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-10 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
              {isFr ? "Creer un compte" : "Create account"}
            </p>
            <h1 className="mt-4 text-3xl">
              {isFr ? "Rejoignez Ciavaglia." : "Join Ciavaglia."}
            </h1>
            <p className="mt-4 text-foreground/70">
              {isFr
                ? "Renseignez vos coordonnees pour un service sur mesure."
                : "Fill in your details for custom service, shipping preferences, and concierge updates."}
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Nom complet" : "Full name"}
                </label>
                <input
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Mot de passe" : "Password"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  required
                  minLength={8}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Telephone" : "Phone"}</label>
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {isFr ? "Adresse de livraison" : "Shipping address"}
                </label>
                <input
                  value={form.shippingAddress}
                  onChange={(event) => updateField("shippingAddress", event.target.value)}
                  required
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Ville" : "City"}</label>
                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    required
                    className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Pays" : "Country"}</label>
                  <input
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value)}
                    required
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
                    value={form.postalCode}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                    required
                    className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                    {isFr ? "Preferences" : "Preferences"}
                  </label>
                  <input
                    value={form.preferences}
                    onChange={(event) => updateField("preferences", event.target.value)}
                    placeholder={isFr ? "Couleur, bracelet, gravure" : "Case tone, strap style, engraving"}
                    className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="btn-hover w-full rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
                disabled={loading}
              >
                {loading ? (isFr ? "Creation..." : "Creating account...") : isFr ? "Creer un compte" : "Create account"}
              </button>
            </form>
            <p className="mt-6 text-sm text-foreground/70">
              {isFr ? "Deja un compte ?" : "Already have an account?"}{" "}
              <Link href={`/${locale}/account/login`} className="text-foreground underline">
                {isFr ? "Connexion" : "Sign in"}
              </Link>
              .
            </p>
          </div>
        </ScrollReveal>
        <div className="space-y-6">
          <ScrollReveal>
            <div className="rounded-[32px] border border-foreground/10 bg-foreground px-8 py-10 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{isFr ? "Conciergerie" : "Concierge service"}</p>
              <h2 className="mt-4 text-2xl">
                {isFr ? "Nous creons avec vous." : "We design with you, not just for you."}
              </h2>
              <p className="mt-4 text-sm text-white/70">
                {isFr
                  ? "Votre compte ouvre un acces direct aux maitres horlogers."
                  : "Your account gives you a dedicated concierge, build timeline alerts, and shipping updates."}
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="rounded-[32px] border border-white/70 bg-white/80 p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                {isFr ? "Confidentialite" : "Data policy"}
              </p>
              <p className="mt-4 text-foreground/70">
                {isFr
                  ? "Vos donnees servent uniquement a creer et livrer votre montre."
                  : "We only use your details to craft, ship, and service your timepieces."}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
