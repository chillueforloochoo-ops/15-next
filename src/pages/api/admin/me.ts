import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const r = await requireAdmin(req);
    if (!r.ok) return res.status(r.status).json({ ok: false });

    return res.status(200).json({ ok: true, userId: r.userId });
  } catch (e: any) {
    console.error("API /admin/me ERROR:", e);
    return res.status(500).json({
      error: e?.message ?? "Internal Server Error",
      hint: "Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL",
    });
  }
}
