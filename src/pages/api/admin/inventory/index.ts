import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

type AdjustBody =
  | {
      action: "adjust"; // 増減
      variant_id: string;
      delta: number; // +10 / -2
      note?: string;
    }
  | {
      action: "set_on_hand"; // 実棚入力
      variant_id: string;
      on_hand: number; // 実棚
      note?: string;
    }
  | {
      action: "recalc_reserved"; // 念のための再計算
      variant_id: string;
    };

function toInt(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  // GET: inventory + events（必要なら）
  if (req.method === "GET") {
    const variantId = typeof req.query.variant_id === "string" ? req.query.variant_id : null;

    const { data: inventory, error: e1 } = await supabaseAdmin
      .from("inventory")
      .select("variant_id,stock_on_hand,reserved,updated_at")
      .order("updated_at", { ascending: false });

    if (e1) return res.status(500).json({ error: e1.message });

    let events: any[] = [];
    if (variantId) {
      const { data, error } = await supabaseAdmin
        .from("inventory_events")
        .select("id,action,delta,note,actor_id,created_at,ref_type,ref_id,on_hand_before,on_hand_after,reserved_before,reserved_after")
        .eq("variant_id", variantId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) events = data;
    }

    return res.status(200).json({ inventory: inventory ?? [], events });
  }

  // PATCH: 1件操作
  if (req.method === "PATCH") {
    const body = (req.body ?? {}) as AdjustBody;

    if (!body || typeof (body as any).variant_id !== "string") {
      return res.status(400).json({ error: "variant_id is required" });
    }
    const variantId = (body as any).variant_id;

    // 現状取得
    const { data: cur, error: e0 } = await supabaseAdmin
      .from("inventory")
      .select("variant_id,stock_on_hand,reserved")
      .eq("variant_id", variantId)
      .maybeSingle();

    if (e0) return res.status(500).json({ error: e0.message });

    const onHandBefore = cur?.stock_on_hand ?? 0;
    const reservedBefore = cur?.reserved ?? 0;

    let nextOnHand = onHandBefore;
    let delta = 0;
    let action: string = (body as any).action;
    let note: string | null = typeof (body as any).note === "string" ? (body as any).note.trim() : null;

    if (action === "adjust") {
      const d = toInt((body as any).delta);
      if (d == null || d === 0) return res.status(400).json({ error: "delta must be non-zero integer" });
      delta = d;
      nextOnHand = onHandBefore + delta;
      if (nextOnHand < 0) return res.status(400).json({ error: "stock_on_hand would go below 0" });
      if (!note) note = delta > 0 ? "入荷/調整" : "減算/調整";
    } else if (action === "set_on_hand") {
      const v = toInt((body as any).on_hand);
      if (v == null || v < 0) return res.status(400).json({ error: "on_hand must be integer >= 0" });
      nextOnHand = v;
      delta = nextOnHand - onHandBefore;
      if (!note) note = "棚卸（実棚）";
    } else if (action === "recalc_reserved") {
      // DB関数で再計算
      const { error } = await supabaseAdmin.rpc("recalc_inventory_reserved", { p_variant_id: variantId });
      if (error) return res.status(500).json({ error: error.message });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // on_hand 更新（recalc_reserved のときは触らない）
    if (action === "adjust" || action === "set_on_hand") {
      const { error: eU } = await supabaseAdmin
        .from("inventory")
        .upsert(
          [{ variant_id: variantId, stock_on_hand: nextOnHand }],
          { onConflict: "variant_id" }
        );

      if (eU) return res.status(500).json({ error: eU.message });

      // ログ
      const { data: afterRow } = await supabaseAdmin
        .from("inventory")
        .select("variant_id,stock_on_hand,reserved,updated_at")
        .eq("variant_id", variantId)
        .single();

      await supabaseAdmin.from("inventory_events").insert({
        actor_id: r.userId ?? null,
        action,
        variant_id: variantId,
        delta,
        on_hand_before: onHandBefore,
        on_hand_after: afterRow?.stock_on_hand ?? nextOnHand,
        reserved_before: reservedBefore,
        reserved_after: afterRow?.reserved ?? reservedBefore,
        note,
      });
    }

    const { data: inventory, error: e1 } = await supabaseAdmin
      .from("inventory")
      .select("variant_id,stock_on_hand,reserved,updated_at")
      .order("updated_at", { ascending: false });

    if (e1) return res.status(500).json({ error: e1.message });

    return res.status(200).json({ ok: true, inventory: inventory ?? [] });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
