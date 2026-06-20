// src/pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

export const config = { api: { bodyParser: false } };

// StripeはapiVersion固定推奨（将来の破壊的変更を避ける）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any,
});

async function readBuffer(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

type ShipInfo = {
  name: string | null;
  phone: string | null;
  postal: string | null;
  pref: string | null;
  city: string | null;
  addr1: string | null;
  addr2: string | null;
};

function pickShipping(session: Stripe.Checkout.Session): ShipInfo {
  const s = session as any;

  // StripeのUI/設定差で揺れるポイントを全部カバー
  const ci = s.collected_information ?? null;
  const sd = ci?.shipping_details ?? s.shipping_details ?? null;
  const cd = s.customer_details ?? null;

  const name: string | null = sd?.name ?? cd?.name ?? null;
  const phone: string | null = cd?.phone ?? null;

  const addr = sd?.address ?? cd?.address ?? null;

  return {
    name,
    phone,
    postal: addr?.postal_code ?? null,
    pref: addr?.state ?? null,
    city: addr?.city ?? null,
    addr1: addr?.line1 ?? null,
    addr2: addr?.line2 ?? null,
  };
}

function toJPYUpper(cur: string | null | undefined) {
  return (cur ?? "jpy").toUpperCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whsec) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");

  let event: Stripe.Event;
  try {
    const rawBody = await readBuffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err?.message ?? err);
    return res.status(400).send(`Webhook Error: ${err?.message ?? "invalid signature"}`);
  }

  try {
    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // paid のみ処理
    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true, skipped: true });
    }

    const ship = pickShipping(session);

    // 金額・通貨・メール（←ここが total NULL を潰す）
    const s: any = session as any;
    const email: string | null =
      s.customer_details?.email ?? s.customer_email ?? null;

    const subtotal: number | null = typeof s.amount_subtotal === "number" ? s.amount_subtotal : null;
    const total: number | null = typeof s.amount_total === "number" ? s.amount_total : null;

    // total_details から拾えるなら拾う（無ければ 0 扱い）
    const shipping: number = typeof s.total_details?.amount_shipping === "number" ? s.total_details.amount_shipping : 0;
    const tax: number = typeof s.total_details?.amount_tax === "number" ? s.total_details.amount_tax : 0;

    // ここで total が null だったら DB が落ちるのでガード
    if (total == null) {
      console.error("[stripe-webhook] Missing amount_total on session:", session.id);
      return res.status(500).send("Missing amount_total on session");
    }

    // subtotal が null の場合は total で代用（割引/税/送料が0の想定ならこれでOK）
    const safeSubtotal = subtotal ?? total;

    const { data, error } = await supabaseAdmin.rpc("handle_checkout_completed_v1", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_session_id: session.id,
      p_payload: { created: event.created, livemode: event.livemode },

      p_email: email,
      p_currency: toJPYUpper(session.currency),
      p_subtotal: safeSubtotal,
      p_shipping: shipping,
      p_tax: tax,
      p_total: total,

      p_ship_name: ship.name,
      p_ship_phone: ship.phone,
      p_ship_postal: ship.postal,
      p_ship_pref: ship.pref,
      p_ship_city: ship.city,
      p_ship_addr1: ship.addr1,
      p_ship_addr2: ship.addr2,
    });

    if (error) throw error;

    return res.status(200).json({ received: true, result: data?.[0] ?? null });
  } catch (err: any) {
    console.error("[stripe-webhook] ERROR:", err?.message ?? err);
    return res.status(500).send(err?.message ?? "Webhook handler failed");
  }
}
