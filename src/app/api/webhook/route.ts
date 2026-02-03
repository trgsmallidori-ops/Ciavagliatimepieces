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

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret?.trim()) {
    console.error("Webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true, skipped: "payment not paid" });
      }

      const configurationId = session.metadata?.configuration_id;
      const summary = session.metadata?.summary ?? "Ciavaglia order";
      const userId = session.metadata?.user_id || null;
      const total = (session.amount_total ?? 0) / 100;
      const customerEmail = session.customer_details?.email || session.customer_email;

      const shipping = session.collected_information?.shipping_details ?? (session as { shipping_details?: { address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string }; name?: string } }).shipping_details;
      const addr = shipping?.address;
      const shippingName = shipping?.name ?? session.customer_details?.name ?? null;
      const shippingLine1 = (addr as { line1?: string } | null)?.line1 ?? null;
      const shippingLine2 = (addr as { line2?: string } | null)?.line2 ?? null;
      const shippingCity = (addr as { city?: string } | null)?.city ?? null;
      const shippingState = (addr as { state?: string } | null)?.state ?? null;
      const shippingPostalCode = (addr as { postal_code?: string } | null)?.postal_code ?? null;
      const shippingCountry = (addr as { country?: string } | null)?.country ?? null;

      const supabase = createServerClient();

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existingOrder) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (configurationId) {
        const { data: config } = await supabase
          .from("configurations")
          .select("type, options")
          .eq("id", configurationId)
          .single();

        const { error: updateConfigError } = await supabase
          .from("configurations")
          .update({ status: "paid" })
          .eq("id", configurationId);

        if (updateConfigError) {
          console.error("Webhook: failed to update configuration", updateConfigError);
          return NextResponse.json(
            { error: "Failed to update configuration", received: false },
            { status: 500 }
          );
        }

        if (config?.type === "built" && config.options?.product_id) {
          const productId = config.options.product_id as string;
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", productId)
            .single();

          const currentStock = product?.stock ?? 0;
          if (currentStock > 0) {
            await supabase
              .from("products")
              .update({
                stock: currentStock - 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", productId)
              .gt("stock", 0);
          }
        }
      }

      const orderType = session.metadata?.type;
      if (orderType === "cart" && userId) {
        const cartProductQuantitiesRaw = session.metadata?.cart_product_quantities;
        if (typeof cartProductQuantitiesRaw === "string") {
          try {
            const cartProductQuantities = JSON.parse(cartProductQuantitiesRaw) as Array<{ product_id: string; quantity: number }>;
            for (const { product_id, quantity } of cartProductQuantities) {
              const qty = Math.max(0, Number(quantity) || 1);
              if (!product_id || qty < 1) continue;
              const { data: product } = await supabase
                .from("products")
                .select("stock")
                .eq("id", product_id)
                .single();
              const currentStock = product?.stock ?? 0;
              if (currentStock > 0) {
                await supabase
                  .from("products")
                  .update({
                    stock: Math.max(0, currentStock - qty),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", product_id);
              }
            }
          } catch (e) {
            console.error("Webhook: failed to parse cart_product_quantities", e);
          }
        }
        await supabase.from("cart_items").delete().eq("user_id", userId);
      }

      const { error: insertOrderError } = await supabase.from("orders").insert({
        configuration_id: orderType === "cart" ? null : configurationId || null,
        user_id: userId,
        total,
        status: "paid",
        summary,
        stripe_session_id: session.id,
        customer_email: customerEmail ?? null,
        shipping_name: shippingName,
        shipping_line1: shippingLine1,
        shipping_line2: shippingLine2,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_postal_code: shippingPostalCode,
        shipping_country: shippingCountry,
      });

      if (insertOrderError) {
        console.error("Webhook: failed to insert order", insertOrderError);
        return NextResponse.json(
          { error: "Failed to create order", received: false },
          { status: 500 }
        );
      }

      if (customerEmail) {
        try {
          await sendOrderEmails({
            customerEmail,
            atelierEmail: process.env.ORDER_NOTIFY_EMAIL ?? "atelier@civagliatimepieces.com",
            summary,
            total,
          });
        } catch (emailError) {
          console.error("Webhook: order emails failed (order already created)", emailError);
          // Do not return 500; order was created successfully
        }
      }
    } catch (error) {
      console.error("Webhook: checkout.session.completed handler error", error);
      return NextResponse.json(
        { error: "Webhook handler failed", received: false },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
