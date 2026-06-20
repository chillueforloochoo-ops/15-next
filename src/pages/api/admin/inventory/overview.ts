import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const r = await requireAdmin(req);
  if (!r.ok) return res.status(r.status).json({ error: "Unauthorized" });

  const { data: products, error: e1 } = await supabaseAdmin
    .from("products")
    .select("id,name,is_active,created_at")
    .order("created_at", { ascending: false });
  if (e1) return res.status(500).json({ error: e1.message });

  const { data: variants, error: e2 } = await supabaseAdmin
    .from("product_variants")
    .select("id,product_id,gender,size,color,sku,is_active,created_at")
    .order("created_at", { ascending: false });
  if (e2) return res.status(500).json({ error: e2.message });

  const { data: inventory, error: e3 } = await supabaseAdmin
    .from("inventory")
    .select("variant_id,stock_on_hand,reserved,updated_at");
  if (e3) return res.status(500).json({ error: e3.message });

  return res.status(200).json({
    products: products ?? [],
    variants: variants ?? [],
    inventory: inventory ?? [],
  });
}
