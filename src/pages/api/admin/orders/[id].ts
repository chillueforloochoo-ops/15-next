// src/pages/api/admin/orders/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

const ALLOWED_STATUS = new Set([
  "paid",
  "picking",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "manual_review",
] as const);

type AllowedStatus =
  (typeof ALLOWED_STATUS extends Set<infer T> ? T : never) & string;

function isAllowedStatus(v: any): v is AllowedStatus {
  return typeof v === "string" && ALLOWED_STATUS.has(v as any);
}

// 最小の遷移ルール（必要なら後で強化）
function canTransition(from: string | null | undefined, to: AllowedStatus) {
  if (!from) return true;

  // 完了/返金/キャンセル後は基本触らない（運用事故防止）
  if (["completed", "cancelled", "refunded"].includes(from)) return false;

  // manual_review はどこへでも戻せる/進められる（運用救済）
  if (from === "manual_review") return true;

  // 通常フロー
  const next: Record<string, AllowedStatus[]> = {
    paid: ["picking", "shipped", "cancelled", "refunded", "manual_review"],
    picking: ["shipped", "cancelled", "refunded", "manual_review"],
    shipped: ["completed", "refunded", "manual_review"],
  };

  return (next[from] ?? []).includes(to);
}

const UNDO_WINDOW_MINUTES = 10;

function minutesBetween(now: Date, then: Date) {
  return Math.floor((now.getTime() - then.getTime()) / 60000);
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });

  // =========================
  // GET: 注文詳細
  // =========================
  if (req.method === "GET") {
    const { data: order, error: e1 } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        created_at,
        placed_at,
        status,
        fulfillment_stage,
        stripe_session_id,
        order_number,
        email,
        subtotal,
        shipping,
        tax,
        total,
        currency,
        shipped_at,
        tracking_number,
        shipped_from_status,
        ship_name,
        ship_phone,
        ship_postal,
        ship_pref,
        ship_city,
        ship_addr1,
        ship_addr2,
        picking_started_at,
        picking_by
        `
      )
      .eq("id", id)
      .single();

    if (e1) return res.status(404).json({ error: e1.message });

    const { data: items, error: e2 } = await supabaseAdmin
      .from("order_items")
      .select(
        `
        id,
        order_id,
        product_uuid,
        product_name,
        variant_id,
        size_label,
        unit_price,
        qty,
        line_total
        `
      )
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (e2) return res.status(500).json({ error: e2.message });

    return res.status(200).json({ order, items: items ?? [] });
  }

  // =========================
  // PATCH: ステータス/発送情報更新 + 監査ログ
  // =========================
  if (req.method === "PATCH") {
    const body = req.body ?? {};
    const nextStatus = body.status as string | undefined;
    const action = body.action as string | undefined;

    // tracking_number を採用（フロントとの互換を確保）
    const trackingNumberRaw = body.tracking_number ?? body.trackingNumber;
    const trackingNumber =
      trackingNumberRaw !== undefined
        ? String(trackingNumberRaw ?? "").trim()
        : undefined;

    // まず現在の注文を取得（遷移ルール/undoのため）
    const { data: current, error: e0 } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,shipped_at,tracking_number,shipped_from_status,picking_started_at,picking_by"
      )
      .eq("id", id)
      .single();

    if (e0) return res.status(404).json({ error: e0.message });

    const before = {
      status: current.status ?? null,
      tracking_number: current.tracking_number ?? null,
      shipped_at: current.shipped_at ?? null,
      picking_started_at: current.picking_started_at ?? null,
      picking_by: current.picking_by ?? null,
    };

    // =========================
    // ★ Undo shipment（発送取り消し）
    // =========================
    if (action === "undo_ship") {
      if (!current.shipped_at || current.status !== "shipped") {
        return res.status(400).json({ error: "Not shipped yet" });
      }

      const shippedAt = new Date(current.shipped_at);
      const now = new Date();
      const diffMin = minutesBetween(now, shippedAt);

      if (diffMin > UNDO_WINDOW_MINUTES) {
        return res.status(400).json({
          error: `Undo window expired (${UNDO_WINDOW_MINUTES} minutes)`,
        });
      }

      const restoreStatus =
        (current.shipped_from_status as string | null) ||
        (current.picking_started_at ? "picking" : "paid");

      const undoPatch: Record<string, any> = {
        status: restoreStatus,
        shipped_at: null,
        tracking_number: null,
      };

      const { data: updated, error: eU } = await supabaseAdmin
        .from("orders")
        .update(undoPatch)
        .eq("id", id)
        .select(
          `
          id,
          created_at,
          placed_at,
          status,
          fulfillment_stage,
          stripe_session_id,
          order_number,
          email,
          subtotal,
          shipping,
          tax,
          total,
          currency,
          shipped_at,
          tracking_number,
          shipped_from_status,
          ship_name,
          ship_phone,
          ship_postal,
          ship_pref,
          ship_city,
          ship_addr1,
          ship_addr2,
          picking_started_at,
          picking_by
          `
        )
        .single();

      if (eU) return res.status(500).json({ error: eU.message });

      // ✅ ログ（updated ができた後）
      try {
        await supabaseAdmin.from("orders_events").insert({
          order_id: id,
          actor_id: r.userId ?? null,
          action: "undo_ship",
          from_status: "shipped",
          to_status: safeStr(updated?.status),
          meta: {
            before,
            patch: undoPatch,
            after: {
              status: updated?.status ?? null,
              tracking_number: updated?.tracking_number ?? null,
              shipped_at: updated?.shipped_at ?? null,
              picking_started_at: updated?.picking_started_at ?? null,
              picking_by: updated?.picking_by ?? null,
            },
          },
        });
      } catch {}

      return res.status(200).json({ order: updated, undone: true });
    }

    // =========================
    // ★ ワンクリック梱包開始
    // =========================
    if (action === "start_picking") {
      const from = current.status ?? null;

      if (!["paid", "manual_review"].includes(from)) {
        return res
          .status(400)
          .json({ error: `Cannot start picking from status=${from}` });
      }

      const startPatch: Record<string, any> = {
        status: "picking",
        picking_started_at: current.picking_started_at ?? new Date().toISOString(),
        picking_by: r.userId,
      };

      const { data: updated, error: e1 } = await supabaseAdmin
        .from("orders")
        .update(startPatch)
        .eq("id", id)
        .select(
          `
          id,
          created_at,
          placed_at,
          status,
          fulfillment_stage,
          stripe_session_id,
          order_number,
          email,
          subtotal,
          shipping,
          tax,
          total,
          currency,
          shipped_at,
          tracking_number,
          shipped_from_status,
          ship_name,
          ship_phone,
          ship_postal,
          ship_pref,
          ship_city,
          ship_addr1,
          ship_addr2,
          picking_started_at,
          picking_by
          `
        )
        .single();

      if (e1) return res.status(500).json({ error: e1.message });

      // ✅ ログ（updated ができた後）
      try {
        await supabaseAdmin.from("orders_events").insert({
          order_id: id,
          actor_id: r.userId ?? null,
          action: "start_picking",
          from_status: safeStr(before.status),
          to_status: safeStr(updated?.status),
          meta: {
            before,
            patch: startPatch,
            after: {
              status: updated?.status ?? null,
              tracking_number: updated?.tracking_number ?? null,
              shipped_at: updated?.shipped_at ?? null,
              picking_started_at: updated?.picking_started_at ?? null,
              picking_by: updated?.picking_by ?? null,
            },
          },
        });
      } catch {}

      return res.status(200).json({ order: updated });
    }

    // =========================
    // status / tracking 更新（通常）
    // =========================
    const patch: Record<string, any> = {};

    if (nextStatus !== undefined) {
      if (!isAllowedStatus(nextStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const isSameStatus = String(nextStatus) === String(current.status);

      if (!isSameStatus) {
        if (!canTransition(current.status, nextStatus)) {
          return res.status(400).json({
            error: `Invalid transition: ${current.status} -> ${nextStatus}`,
          });
        }
      }

      if (nextStatus === "shipped") {
        const tn = trackingNumber ?? current.tracking_number ?? "";
        if (!tn) {
          return res.status(400).json({
            error: "tracking_number is required when status=shipped",
          });
        }

        patch.shipped_at = current.shipped_at ?? new Date().toISOString();

        if (!current.shipped_from_status) {
          patch.shipped_from_status = current.status;
        }
      }

      patch.status = nextStatus;
    }

    if (trackingNumber !== undefined) {
      patch.tracking_number = trackingNumber || null;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data: updated, error: e1 } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select(
        `
        id,
        created_at,
        placed_at,
        status,
        fulfillment_stage,
        stripe_session_id,
        order_number,
        email,
        subtotal,
        shipping,
        tax,
        total,
        currency,
        shipped_at,
        tracking_number,
        shipped_from_status,
        ship_name,
        ship_phone,
        ship_postal,
        ship_pref,
        ship_city,
        ship_addr1,
        ship_addr2,
        picking_started_at,
        picking_by
        `
      )
      .single();

    if (e1) return res.status(500).json({ error: e1.message });

    // ✅ ログ（updated ができた後）
    try {
      await supabaseAdmin.from("orders_events").insert({
        order_id: id,
        actor_id: r.userId ?? null,
        action: "patch",
        from_status: safeStr(before.status),
        to_status: safeStr(updated?.status),
        meta: {
          before,
          patch,
          after: {
            status: updated?.status ?? null,
            tracking_number: updated?.tracking_number ?? null,
            shipped_at: updated?.shipped_at ?? null,
            picking_started_at: updated?.picking_started_at ?? null,
            picking_by: updated?.picking_by ?? null,
          },
        },
      });
    } catch {}

    return res.status(200).json({ order: updated });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
