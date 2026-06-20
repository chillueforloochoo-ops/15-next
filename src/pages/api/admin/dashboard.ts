// src/pages/api/admin/dashboard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

const LOW_STOCK_THRESHOLD = 2;

// 未発送として扱うステータス（運用に合わせてここだけ増減）
const UNSHIPPED_STATUSES = ["paid", "picking"] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ---- defaults (never 500) ----
  let orders_7d = 0;
  let revenue_7d = 0;

  let unpaid_or_processing = 0;
  let paid_unshipped = 0;

  let zero = 0;
  let low = 0;

  let top_skus_7d: any[] = [];

  // ★ 未発送（正確版）
  let unshipped_count = 0;
  let unshipped: Array<{
    id: string;
    created_at: string;
    status: string;
    thumb_url: string | null;
  }> = [];

  // 1) orders (7d KPI)
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id,created_at,total,status")
      .gte("created_at", since);

    if (!error && data) {
      orders_7d = data.length;
      revenue_7d = data.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);

      // ★ ここは “未発送” とは切り離す（KPIとしての「未払い/処理中」だけ残す）
      unpaid_or_processing = data.filter((o: any) => o.status !== "paid").length;
    } else {
      console.warn("[dashboard] orders query failed:", error?.message);
    }
  } catch (e) {
    console.warn("[dashboard] orders exception:", e);
  }

  // 1-2) ★ “未発送数” は別クエリで正確に（期間制限なし）
  try {
    const { count, error } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", [...UNSHIPPED_STATUSES])
      .is("shipped_at", null);

    if (!error && typeof count === "number") {
      paid_unshipped = count;      // KPI用
      unshipped_count = count;     // todo用（両方同じ値にしておく）
    } else if (error) {
      console.warn("[dashboard] paid_unshipped count failed:", error.message);
    }
  } catch (e) {
    console.warn("[dashboard] paid_unshipped exception:", e);
  }

  // 2) inventory (best-effort)
  try {
    const { data, error } = await supabaseAdmin.from("inventory").select("*");
    if (!error && data) {
      for (const r of data as any[]) {
        const stock = r.stock_on_hand ?? r.stock ?? 0;
        const reserved = r.reserved ?? 0;
        const available = stock - reserved;

        if (available <= 0) zero += 1;
        else if (available <= LOW_STOCK_THRESHOLD) low += 1;
      }
    } else {
      console.warn("[dashboard] inventory query failed:", error?.message);
    }
  } catch (e) {
    console.warn("[dashboard] inventory exception:", e);
  }

  // 3) top sku (best-effort)
  try {
    const { data, error } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .gte("created_at", since);

    if (!error && data) {
      const map = new Map<string, any>();

      for (const it of data as any[]) {
        const sku = it.sku ?? it.variant_sku ?? it.product_sku ?? "UNKNOWN";
        const qty = it.qty ?? it.quantity ?? 0;

        const prev = map.get(sku);
        if (!prev) {
          map.set(sku, {
            sku,
            name: it.product_name ?? it.name ?? it.title ?? null,
            qty,
            thumb_url: it.thumb_url ?? null,
          });
        } else {
          prev.qty += qty;
        }
      }

      top_skus_7d = Array.from(map.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);
    } else {
      console.warn("[dashboard] order_items query failed:", error?.message);
    }
  } catch (e) {
    console.warn("[dashboard] order_items exception:", e);
  }

  // 4) ★ 未発送プレビュー（最大3件 / shipped_at null）
  try {
    const { data: o3, error: e2 } = await supabaseAdmin
      .from("orders")
      .select("id,created_at,status")
      .in("status", [...UNSHIPPED_STATUSES])
      .is("shipped_at", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (e2) {
      console.warn("[dashboard] unshipped list failed:", e2.message);
    } else {
      const ids = (o3 ?? []).map((x: any) => x.id).filter(Boolean);

      const thumbByOrder = new Map<string, string | null>();

      try {
        if (ids.length) {
          const { data: items, error: e3 } = await supabaseAdmin
            .from("order_items")
            .select("order_id, products(image_url)")
            .in("order_id", ids)
            .order("created_at", { ascending: true });

          if (e3) {
            console.warn("[dashboard] unshipped thumbs failed:", e3.message);
          } else {
            for (const it of items ?? []) {
              const oid = (it as any).order_id;
              if (!oid || thumbByOrder.has(oid)) continue;
              const url = (it as any)?.products?.image_url ?? null;
              thumbByOrder.set(oid, url);
            }
          }
        }
      } catch (e) {
        console.warn("[dashboard] unshipped thumbs exception:", e);
      }

      unshipped = (o3 ?? []).map((o: any) => ({
        id: String(o.id),
        created_at: String(o.created_at),
        status: String(o.status ?? ""),
        thumb_url: thumbByOrder.get(String(o.id)) ?? null,
      }));
    }
  } catch (e) {
    console.warn("[dashboard] unshipped exception:", e);
  }

  return res.status(200).json({
    kpi: { orders_7d, revenue_7d, unpaid_or_processing, paid_unshipped },
    inventory: { zero, low },
    top_skus_7d,
    todo: {
      unshipped_count,
      unshipped,
    },
  });
}
