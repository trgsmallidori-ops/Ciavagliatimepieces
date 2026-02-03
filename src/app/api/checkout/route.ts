import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSiteUrl, getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Missing or invalid body" }, { status: 400 });
  }

  type CheckoutPayload = {
    locale?: string;
    type?: string;
    userId?: string | null;
    configuration?: Record<string, string | number>;
    productId?: string;
  };
  const body = payload as CheckoutPayload;
  const { locale, type, userId } = body;

  if (!locale || typeof locale !== "string") {
    return NextResponse.json({ error: "Missing locale" }, { status: 400 });
  }
  if (type !== "custom" && type !== "built") {
    return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
  }
  if (type === "custom" && !body.configuration) {
    return NextResponse.json({ error: "Missing configuration for custom build" }, { status: 400 });
  }
  if (type === "built" && !body.productId) {
    return NextResponse.json({ error: "Missing product" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    let summary = "Ciavaglia timepiece";
    let amount = 0;
    let configurationId: string | null = null;

    if (type === "custom" && body.configuration) {
    const cfg = body.configuration as Record<string, unknown>;
    amount = Number(cfg.price ?? 0);
    summary = "Custom build";

    const { data, error } = await supabase
      .from("configurations")
      .insert({
        type: "custom",
        options: body.configuration,
        status: "pending",
        price: amount,
        user_id: userId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    configurationId = data.id;
    }

    if (type === "built" && body.productId) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .eq("id", body.productId)
      .eq("active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 404 });
    }

    const stock = product.stock ?? 0;
    if (stock < 1) {
      return NextResponse.json({ error: "Out of stock" }, { status: 400 });
    }

    summary = `Built watch · ${product.name}`;
    amount = Number(product.price);

    const { data, error } = await supabase
      .from("configurations")
      .insert({
        type: "built",
        options: { product_id: product.id, title: product.name },
        status: "pending",
        price: amount,
        user_id: userId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    configurationId = data.id;
    }

    const siteUrl = getSiteUrl();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: summary,
          },
          unit_amount: Math.round(amount * 100),
        },
      },
    ],
    success_url: `${siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/${locale}/checkout/cancel`,
    metadata: {
      configuration_id: configurationId ?? "",
      summary,
      locale,
      type,
      user_id: userId ?? "",
    },
    billing_address_collection: "required",
    allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", error);
    if (message.includes("stock") || message.includes("product")) {
      return NextResponse.json({ error: "Product unavailable. Please refresh and try again." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
