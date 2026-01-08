import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ envチェック（ここで落ちてることが多い）
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return res.status(500).json({ error: "Missing NEXT_PUBLIC_SITE_URL" });
    }

    // ✅ envチェック後に Stripe 初期化（順番大事）
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { items, customer } = req.body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items" });
    }

    // ✅ customer は任意（bag からは送らない想定）
    const hasCustomer =
      typeof customer?.email === "string" && customer.email.trim().length > 0;

    // ✅ Stripeに送る line_items（imagesは入れない）
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (it: any) => ({
        quantity: Number(it.qty ?? 1),
        price_data: {
          currency: "jpy",
          unit_amount: Number(it.price), // 3800 みたいな「円」を想定（= 3800円）
          product_data: {
            name: String(it.name ?? "Item"),
            metadata: {
              size: String(it.size ?? ""),
              slug: String(it.slug ?? ""),
              productId: String(it.id ?? ""),
            },
          },
        },
      })
    );

    const session = await stripe.checkout.sessions.create({
      ui_mode: "hosted",
      mode: "payment",
      payment_method_types: ["card"],
      line_items,

      // ✅ Stripe側で住所/電話を入力してもらう
      shipping_address_collection: { allowed_countries: ["JP"] },
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },

      // ✅ customer が渡ってきた時だけメールをプリセット
      ...(hasCustomer ? { customer_email: customer.email } : {}),

      // ✅ customer が無くてもStripeが顧客を作れるように（メールはCheckoutで入力される）
      customer_creation: "always",

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bag`,

      // ✅ metadata は任意（checkoutページ経由のときだけ入る）
      metadata: hasCustomer
        ? {
            name: `${customer.lastName ?? ""} ${customer.firstName ?? ""}`.trim(),
            phone: String(customer.phone ?? ""),
            postal: String(customer.postal ?? ""),
            prefecture: String(customer.prefecture ?? ""),
            city: String(customer.city ?? ""),
            address1: String(customer.address1 ?? ""),
            address2: String(customer.address2 ?? ""),
          }
        : {},
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    // ✅ Stripeのエラー本文をターミナルに出す
    console.error("[checkout-session] ERROR:", err);

    // 画面にも最低限返す（デバッグ中だけ）
    return res.status(500).json({
      error: err?.message ?? "Internal Server Error",
      type: err?.type,
      code: err?.code,
    });
  }
}
