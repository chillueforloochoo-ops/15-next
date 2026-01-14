import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string); // ✅ apiVersion指定しない

function buffer(readable: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readable.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

// ✅ サーバー専用（Service Role）
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");

  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whsec) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
  } catch (err: any) {
    console.error("[stripe-webhook] signature verify failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ paid以外はスキップ（カード決済ならほぼpaid）
    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true, skipped: true });
    }

    const stripeSessionId = session.id;

    // ✅ line_items を取りに行く（商品名/qty/価格/metadata）
    const lineItems = await stripe.checkout.sessions.listLineItems(stripeSessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    const email =
      session.customer_details?.email ??
      session.customer_email ??
      "";

    const total = session.amount_total ?? 0;

    // ✅ ① orders を upsert（冪等）
    // stripe_session_id が unique なので、何回Webhookが来ても同じ1行に収束する
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .upsert(
        {
          stripe_session_id: stripeSessionId,
          order_number: stripeSessionId, // 後で採番を整えてもOK
          email,
          subtotal: session.amount_subtotal ?? null,
          shipping: null,
          tax: null,
          total,
          currency: (session.currency ?? "jpy").toUpperCase(),
          status: session.payment_status, // "paid" をそのまま入れるのが一番ラク
          placed_at: new Date().toISOString(),
        },
        { onConflict: "stripe_session_id" }
      )
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    // ✅ ② order_items は一旦削除して入れ直し（冪等）
    const { error: delErr } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", order.id);

    if (delErr) throw delErr;

    const itemsPayload = lineItems.data.map((li) => {
      const qty = li.quantity ?? 1;

      // unit_price は price.unit_amount があればそれを優先
      const unit =
        li.price?.unit_amount != null
          ? li.price.unit_amount
          : li.amount_subtotal != null
            ? Math.round(li.amount_subtotal / qty)
            : 0;

      const product = li.price?.product as Stripe.Product | null;
      const meta = (product?.metadata ?? {}) as Record<string, string>;

      return {
        order_id: order.id,
        product_id: meta.productId || null,
        variant_id: null, // 後で size+color などを入れたいなら metadata を増やす
        product_name: product?.name ?? li.description ?? meta.slug ?? "Item",
        size_label: meta.size || null,
        unit_price: unit,
        qty,
        line_total: unit * qty,
      };
    });

    if (itemsPayload.length > 0) {
      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(itemsPayload);

      if (itemsErr) throw itemsErr;
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] ERROR:", err?.message || err);
    // 2xx以外だとStripeが再送する。原因調査したい時は500でOK
    return res.status(500).send("Webhook handler failed");
  }
}
