import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

type ReqItem = {
  variant_id: string; // uuid string（product_variants.id）
  qty: number;
};

type ReqBody = {
  items: ReqItem[];
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    postal?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
  };
};

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

    const { items, customer } = (req.body ?? {}) as ReqBody;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items" });
    }

    // ✅ customer は任意（bag からは送らない想定）
    const hasCustomer =
      typeof customer?.email === "string" && customer.email.trim().length > 0;

    // ✅ itemsの最小バリデーション
    const normalizedItems = items.map((it) => ({
      variant_id: String(it.variant_id ?? ""),
      qty: Number(it.qty ?? 1),
    }));

    if (normalizedItems.some((it) => !it.variant_id || !Number.isFinite(it.qty) || it.qty <= 0)) {
      return res.status(400).json({ error: "Invalid items (variant_id/qty)" });
    }

    // ① DBから variant + product を取得（価格・product_uuid を確定：改ざん対策）
    const variantIds = normalizedItems.map((it) => it.variant_id);

    const { data: variants, error: vErr } = await supabaseAdmin
      .from("product_variants")
      .select(
        `
        id,
        price,
        size,
        color,
        gender,
        product:products (
          id,
          name
        )
      `
      )
      .in("id", variantIds);

    if (vErr) throw new Error(`Failed to fetch variants: ${vErr.message}`);

    // 件数チェック（variant_idが存在しないものが混ざってるとズレる）
    if (!variants || variants.length !== variantIds.length) {
      return res.status(400).json({ error: "Invalid variant_id included" });
    }

    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    // ② itemsSnapshot を作る（★ここが真実データ）
    const itemsSnapshot = normalizedItems.map((it) => {
      const v = variantMap.get(it.variant_id);
      if (!v) {
        // ここに来るのは基本あり得ない（件数チェック済み）けど安全のため
        throw new Error(`Variant not found: ${it.variant_id}`);
      }

      const unit = Number(v.price ?? 0);
      if (!Number.isFinite(unit) || unit <= 0) {
        throw new Error(`Invalid price for variant: ${it.variant_id}`);
      }

      const qty = it.qty;

      return {
        product_uuid: v.product.id as string, // ★ JOIN用（products.id）
        variant_id: v.id as string, // product_variants.id
        product_name: v.product.name as string,
        size_label: `${v.gender}/${v.size}/${v.color}`,
        unit_price: unit,
        qty,
        line_total: unit * qty,
      };
    });

    // ③ Stripeに送る line_items（必ず itemsSnapshot から作る）
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = itemsSnapshot.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: "jpy",
        unit_amount: i.unit_price, // 3800円なら 3800
        product_data: {
          name: i.product_name,
          // ここに metadata を入れたいなら入れてOK（ただし注文確定はDBスナップショットが正）
          // metadata: { variant_id: i.variant_id, product_uuid: i.product_uuid, size: i.size_label },
        },
      },
    }));

    // ④ Stripe Checkout Session 作成
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
      ...(hasCustomer ? { customer_email: customer!.email!.trim() } : {}),

      // ✅ customer が無くてもStripeが顧客を作れるように（メールはCheckoutで入力される）
      customer_creation: "always",

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bag`,

      // ✅ metadata は任意（checkoutページ経由のときだけ入る）
      metadata: hasCustomer
        ? {
            name: `${customer?.lastName ?? ""} ${customer?.firstName ?? ""}`.trim(),
            phone: String(customer?.phone ?? ""),
            postal: String(customer?.postal ?? ""),
            prefecture: String(customer?.prefecture ?? ""),
            city: String(customer?.city ?? ""),
            address1: String(customer?.address1 ?? ""),
            address2: String(customer?.address2 ?? ""),
          }
        : {},
    });

    // ⑤ ★ここが追加：checkout_sessions にスナップショット保存（webhookが参照する）
    const { error: snapErr } = await supabaseAdmin
      .from("checkout_sessions")
      .upsert(
        {
          stripe_session_id: session.id,
          user_id: null, // ログイン購入なら auth uid を入れてOK
          items: itemsSnapshot,
        },
        { onConflict: "stripe_session_id" }
      );

    if (snapErr) {
      // 運用的には「保存失敗 = webhookで注文作れない」のでここで落とすのが安全
      throw new Error(`Failed to save checkout snapshot: ${snapErr.message}`);
    }

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
