import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

export default async function CheckoutCancel({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <section className="px-6">
      <ScrollReveal>
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/70 bg-white/80 p-10 text-center text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
          <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
            {isFr ? "Paiement annule" : "Checkout canceled"}
          </p>
          <h1 className="mt-4 text-3xl">
            {isFr ? "Le paiement n'a pas ete finalise." : "Your payment was not completed."}
          </h1>
          <p className="mt-4 text-foreground/70">
            {isFr
              ? "Revenez au configurateur ou a la boutique quand vous le souhaitez."
              : "You can return to the configurator or shop whenever you are ready."}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={`/${locale}`}
              className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.3em] text-white"
            >
              {isFr ? "Retour à l'accueil" : "Return Home"}
            </Link>
            <Link
              href={`/${locale}/shop`}
              className="rounded-full border border-foreground/30 px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground/70"
            >
              {isFr ? "Explorer les montres" : "Explore Watches"}
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
