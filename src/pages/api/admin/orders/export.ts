// src/pages/api/admin/orders/export.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function maskTrackingTail(t?: string | null) {
  const s = String(t ?? "").trim();
  if (!s) return "";
  return s.length <= 6 ? s : s.slice(-6);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  const { from, to } = req.query as Record<string, string>;

  let q = supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      shipped_at,
      email,
      ship_name,
      total,
      tracking_number,
      order_items ( product_name, qty )
      `
    )
    .eq("status", "shipped")
    .not("shipped_at", "is", null)
    .order("shipped_at", { ascending: false });

  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) q = q.gte("shipped_at", d.toISOString());
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) q = q.lte("shipped_at", d.toISOString());
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const header = ["shipped_at", "email", "ship_name", "total", "tracking_tail", "items_summary", "order_id"];

  const lines = [
    header.join(","),
    ...(data ?? []).map((o: any) => {
      const its = Array.isArray(o.order_items) ? o.order_items : [];
      const summary = its
        .map((it: any) => `${String(it.product_name ?? "").trim() || "?"}×${Number(it.qty ?? 1) || 1}`)
        .join(" / ");

      const row = {
        shipped_at: o.shipped_at ?? "",
        email: o.email ?? "",
        ship_name: o.ship_name ?? "",
        total: o.total ?? 0,
        tracking_tail: maskTrackingTail(o.tracking_number ?? ""),
        items_summary: summary,
        order_id: o.id ?? "",
      };

      return header.map((k) => csvEscape((row as any)[k])).join(",");
    }),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="orders_history.csv"`);
  res.status(200).send("\uFEFF" + lines.join("\n")); // Excel対策(BOM)
}
