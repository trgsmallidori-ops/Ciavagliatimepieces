"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const searchParams = useSearchParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const router = useRouter();
  const redirectTo = searchParams.get("redirect");
  const isFr = locale === "fr";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (redirectTo && redirectTo.startsWith("/")) {
        router.push(redirectTo);
      } else {
        router.push(`/${locale}/account/manage`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-6">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <ScrollReveal>
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-10 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">{isFr ? "Compte" : "Account"}</p>
            <h1 className="mt-4 text-3xl">
              {isFr ? "Connectez-vous a votre profil." : "Sign in to your account."}
            </h1>
            <p className="mt-4 text-foreground/70">
              {isFr
                ? "Accedez a vos configurations, commandes et livraisons."
                : "Access your saved configurations, orders, and shipment tracking from one place."}
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-foreground/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="mt-2 w-full rounded-full border border-foreground/20 bg-white/80 px-4 py-3 text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="btn-hover w-full rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
                disabled={loading}
              >
                {loading ? (isFr ? "Connexion..." : "Signing in...") : isFr ? "Connexion" : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-sm text-foreground/70">
              {isFr ? "Nouveau chez Ciavaglia ?" : "New to Ciavaglia?"}{" "}
              <Link href={`/${locale}/account/sign-up`} className="text-foreground underline">
                {isFr ? "Creer un compte" : "Create an account"}
              </Link>
              .
            </p>
          </div>
        </ScrollReveal>
        <div className="space-y-6">
          <ScrollReveal>
            <div className="rounded-[32px] border border-foreground/10 bg-foreground px-8 py-10 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{isFr ? "Avantages" : "Member perks"}</p>
              <ul className="mt-6 space-y-3 text-sm text-white/80">
                <li>{isFr ? "Sauvegardez vos configurations." : "Save unlimited configurations and price snapshots."}</li>
                <li>{isFr ? "Suivez la fabrication." : "Track build milestones and updates."}</li>
                <li>{isFr ? "Acces aux editions limitees." : "Access invite-only drops and limited runs."}</li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="rounded-[32px] border border-white/70 bg-white/80 p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">{isFr ? "Assistance" : "Need help?"}</p>
              <p className="mt-4 text-foreground/70">concierge@civagliatimepieces.com</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
