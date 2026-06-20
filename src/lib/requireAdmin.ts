// src/lib/requireAdmin.ts
import type { NextApiRequest } from "next";
import { supabaseAdmin } from "./supabaseAdmin.server";

export async function requireAdmin(req: NextApiRequest) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1];

  if (!accessToken) {
    return { ok: false as const, status: 401, userId: null };
  }

  // access token を検証（Service Role で検証可能）
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { ok: false as const, status: 401, userId: null };
  }

  const userId = data.user.id;

  // admin_users に存在するか確認
  const { data: adminRow, error: e2 } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (e2 || !adminRow) {
    return { ok: false as const, status: 403, userId };
  }

  return { ok: true as const, status: 200, userId };
}
