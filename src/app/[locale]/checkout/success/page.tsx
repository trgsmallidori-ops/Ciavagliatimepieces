import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/** Order is only created by the Stripe webhook after payment is verified. */
async function getOrderByStripeSessionId(sessionId: string | null) {
  if (!sessionId?.trim()) return null;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, summary, total, status")
      .eq("stripe_session_id", sessionId.trim())
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/** Get invoice PDF or hosted URL from completed Checkout Session (for download link). */
async function getInvoiceUrlFromSession(sessionId: string | null): Promise<string | null> {
  if (!sessionId?.trim()) return null;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: ["invoice"],
    });
    if (session.payment_status !== "paid" || !session.invoice) return null;
    const invoice = session.invoice as { invoice_pdf?: string | null; hosted_invoice_url?: string | null };
    return invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null;
  } catch {
    return null;
  }
}

export default async function CheckoutSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const isFr = locale === "fr";

  const order = await getOrderByStripeSessionId(session_id ?? null);
  const verified = !!order && order.status === "paid";
  const invoiceUrl = await getInvoiceUrlFromSession(session_id ?? null);

  return (
    <section className="px-6">
      <ScrollReveal>
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/70 bg-white/80 p-10 text-center text-foreground shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
          {verified ? (
            <>
              <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
                {isFr ? "Paiement vérifié" : "Payment verified"}
              </p>
              <h1 className="mt-4 text-3xl">
                {isFr ? "Votre commande est confirmée." : "Your Ciavaglia order is confirmed."}
              </h1>
              <p className="mt-4 text-foreground/70">
                {isFr
                  ? "Un e-mail de confirmation a été envoyé. Votre pièce est en préparation."
                  : "A confirmation email has been sent. We have been notified and will begin your build."}
              </p>
              {order?.summary && (
                <p className="mt-2 text-sm text-foreground/60">
                  {order.summary} · ${Number(order.total).toLocaleString()}
                </p>
              )}
              {invoiceUrl && (
                <p className="mt-4">
                  <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full border border-foreground/30 px-6 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-foreground/5"
                  >
                    {isFr ? "Télécharger la facture" : "Download invoice"}
                  </a>
                </p>
              )}
            </>
          ) : session_id ? (
            <>
              <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
                {isFr ? "En cours" : "Processing"}
              </p>
              <h1 className="mt-4 text-3xl">
                {isFr ? "Merci pour votre paiement." : "Thank you for your payment."}
              </h1>
              <p className="mt-4 text-foreground/70">
                {isFr
                  ? "Nous vérifions votre transaction et confirmerons votre commande sous peu. Vous recevrez un e-mail dès que ce sera fait."
                  : "We are verifying your transaction and will confirm your order shortly. You will receive an email once it is confirmed."}
              </p>
              {invoiceUrl && (
                <p className="mt-4">
                  <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full border border-foreground/30 px-6 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-foreground/5"
                  >
                    {isFr ? "Télécharger la facture" : "Download invoice"}
                  </a>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
                {isFr ? "Checkout" : "Checkout"}
              </p>
              <h1 className="mt-4 text-3xl">
                {isFr ? "Page de confirmation" : "Confirmation page"}
              </h1>
              <p className="mt-4 text-foreground/70">
                {isFr
                  ? "Si vous venez d’effectuer un achat, votre commande est en cours de traitement."
                  : "If you just completed a purchase, your order is being processed."}
              </p>
            </>
          )}
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
