import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendOrderEmails } from "@/lib/email";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (error) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const configurationId = session.metadata?.configuration_id;
    const summary = session.metadata?.summary ?? "Civaglia order";
    const userId = session.metadata?.user_id || null;
    const total = (session.amount_total ?? 0) / 100;
    const customerEmail = session.customer_details?.email || session.customer_email;

    const supabase = createServerClient();

    if (configurationId) {
      await supabase
        .from("configurations")
        .update({ status: "paid" })
        .eq("id", configurationId);
    }

    await supabase.from("orders").insert({
      configuration_id: configurationId,
      user_id: userId,
      total,
      status: "paid",
      summary,
      stripe_session_id: session.id,
    });

    if (customerEmail) {
      await sendOrderEmails({
        customerEmail,
        atelierEmail: process.env.ORDER_NOTIFY_EMAIL ?? "atelier@civagliatimepieces.com",
        summary,
        total,
      });
    }
  }

  return NextResponse.json({ received: true });
}
