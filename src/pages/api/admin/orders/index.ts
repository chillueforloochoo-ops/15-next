// src/pages/api/admin/orders/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

// amount_total互換のため、totalをamount_totalとして返す
const SORT_WHITELIST = new Set(["created_at", "status", "total", "shipped_at"] as const);

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function toSafeNumber(v: unknown, fallback: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseStatusList(raw?: string | null) {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const set = new Set<string>();
  for (const s of parts) {
    set.add(s);
    if (s === "picking") set.add("preparing");
    if (s === "preparing") set.add("picking");
    if (s === "cancelled") set.add("canceled");
    if (s === "canceled") set.add("cancelled");
  }
  return Array.from(set);
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

// ✅ JSTの「今日」(00:00〜24:00) をUTCに変換して返す
function getTodayRangeJST() {
  const now = new Date();
  const JST_OFFSET = 9 * 60 * 60 * 1000;

  const jstNow = new Date(now.getTime() + JST_OFFSET);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0) - JST_OFFSET;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  const {
    q = "",
    status,
    from,
    to,
    limit = "50",
    offset = "0",
    sort = "created_at",
    dir = "desc",
    shipped,
    tab,

    // ✅ 作業用フィルタ（open専用）
    today,
    hold_only,
    tracking_missing,
    min_total,
  } = req.query as Record<string, string>;

  const tabStr = String(tab ?? "open");
  const isOpen = tabStr === "open" || tabStr === "unshipped";
  const isHistory = tabStr === "history";

  const sortKey = (sort === "amount_total" ? "total" : sort) as any;
  const safeSort = SORT_WHITELIST.has(sortKey) ? sortKey : "created_at";
  const safeDir = dir === "asc" ? "asc" : "desc";

  const lim = Math.min(Math.max(toSafeNumber(limit, 50), 1), 200);
  const off = Math.max(toSafeNumber(offset, 0), 0);

  let query = supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      created_at,
      status,
      total,
      email,
      fulfillment_stage,
      ship_name,
      ship_postal,
      ship_pref,
      ship_city,
      ship_addr1,
      shipped_at,
      tracking_number,
      orders_events (
        created_at,
        actor_id,
        action,
        from_status,
        to_status
      ),
      order_items (
        product_name,
        qty
      )
      `,
      { count: "exact" }
    );

  // q 検索
  const qTrim = (q ?? "").trim();
  if (qTrim) {
    const ors = [`email.ilike.%${qTrim}%`, `stripe_session_id.ilike.%${qTrim}%`];
    if (isUuid(qTrim)) ors.push(`id.eq.${qTrim}`);
    query = query.or(ors.join(","));
  }

  // status フィルタ
  const statusList = parseStatusList(status);

  if (statusList && statusList.length === 1) {
    query = query.eq("status", statusList[0]);
  } else if (statusList && statusList.length >= 2) {
    query = query.in("status", statusList);
  } else {
    // status未指定のときだけタブで絞る（運用フロー最優先）
    if (isOpen) {
      query = query.in("status", ["paid", "picking", "manual_review", "hold"]);
      query = query.is("shipped_at", null); // 念のため事故防止
    } else if (isHistory) {
      query = query.eq("status", "shipped");
      query = query.not("shipped_at", "is", null);
    }
  }

  // shipped=0 互換
  if (shipped === "0" && (!statusList || statusList.length === 0)) {
    query = query.in("status", ["paid", "picking", "manual_review", "hold"]).is("shipped_at", null);
  }

  // ✅ 作業用フィルタ（open専用）
  if (isOpen) {
    if (today === "1") {
      const { startIso, endIso } = getTodayRangeJST();
      query = query.gte("created_at", startIso).lt("created_at", endIso);
    }

    if (hold_only === "1") {
      query = query.eq("status", "manual_review");
    }

    if (tracking_missing === "1") {
      // tracking_number が null または "" を拾う
      query = query.or("tracking_number.is.null,tracking_number.eq.");
    }

    if (min_total) {
      const v = toSafeNumber(min_total, 0);
      if (v > 0) query = query.gte("total", v);
    }
  }

  // from/to：履歴は shipped_at、未発送は created_at
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) {
      query = isHistory ? query.gte("shipped_at", d.toISOString()) : query.gte("created_at", d.toISOString());
    }
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      query = isHistory ? query.lte("shipped_at", d.toISOString()) : query.lte("created_at", d.toISOString());
    }
  }

  query = query.order(safeSort, { ascending: safeDir === "asc" }).range(off, off + lim - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // サムネ・先頭商品名・点数合計（best-effort）
  const ids = (data ?? []).map((o: any) => o.id).filter(Boolean) as string[];

  const thumbById = new Map<string, string | null>();
  const productById = new Map<string, { name: string | null; qty: number }>();

  try {
    if (ids.length > 0) {
      const { data: items2, error: e2 } = await supabaseAdmin
        .from("order_items")
        .select("order_id, quantity, products ( name, image_url )")
        .in("order_id", ids)
        .order("created_at", { ascending: true });

      if (!e2 && items2) {
        for (const it of items2 as any[]) {
          const oid = String(it.order_id ?? "");
          if (!oid) continue;

          const qty = Number(it.quantity ?? 0) || 0;
          const name = it?.products?.name ?? null;

          if (!productById.has(oid)) productById.set(oid, { name, qty });
          else {
            const cur = productById.get(oid)!;
            productById.set(oid, { name: cur.name, qty: cur.qty + qty });
          }

          if (!thumbById.has(oid)) {
            const url = it?.products?.image_url ?? null;
            thumbById.set(oid, url);
          }
        }
      }
    }
  } catch {}

  const items = (data ?? []).map((o: any) => {
    const p = productById.get(String(o.id));
    const ship_summary = [o.ship_pref, o.ship_city, o.ship_addr1].filter(Boolean).join(" ");

    const evs = Array.isArray(o.orders_events) ? o.orders_events : [];
    evs.sort((a: any, b: any) => safeStr(b.created_at).localeCompare(safeStr(a.created_at)));
    const last = evs[0] ?? null;

    return {
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      amount_total: o.total ?? 0,
      email: o.email,
      stripe_session_id: o.stripe_session_id,

      thumb_url: thumbById.get(String(o.id)) ?? null,
      fulfillment_stage: o.fulfillment_stage ?? "pack",

      product_name: p?.name ?? null,
      items_qty: p ? p.qty : null,

      ship_postal: o.ship_postal ?? null,
      ship_name: o.ship_name ?? null,
      ship_summary: ship_summary || null,

      shipped_at: o.shipped_at ?? null,
      tracking_number: o.tracking_number ?? null,

      last_event_at: last?.created_at ?? null,
      last_event_actor: last?.actor_id ?? null,
      last_event_action: last?.action ?? null,
      last_event_from: last?.from_status ?? null,
      last_event_to: last?.to_status ?? null,
    };
  });

  return res.status(200).json({ items, count: count ?? 0 });
}
