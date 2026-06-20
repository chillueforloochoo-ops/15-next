// src/pages/admin/orders/[id].tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { AdminSelect } from "@/components/admin/AdminSelect";

type Order = {
  id: string;
  created_at?: string;
  placed_at?: string;
  status?: string;
  fulfillment_stage?: string | null;
  stripe_session_id?: string | null;
  order_number?: string | null;

  email?: string | null;

  subtotal?: number | null;
  shipping?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;

  shipped_at?: string | null;
  tracking_number?: string | null;
  shipped_from_status?: string | null;

  ship_name?: string | null;
  ship_phone?: string | null;
  ship_postal?: string | null;
  ship_pref?: string | null;
  ship_city?: string | null;
  ship_addr1?: string | null;
  ship_addr2?: string | null;

  picking_started_at?: string | null;
  picking_by?: string | null;
};

type Item = {
  id: string;
  variant_id?: string | null; // ★返品に必要
  product_uuid?: string | null;
  product_name?: string | null;
  size_label?: string | null;
  unit_price?: number | null;
  qty?: number | null;
  line_total?: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  paid: "支払い済み",
  picking: "準備中",
  shipped: "発送済み",
  completed: "完了",
  cancelled: "キャンセル",
  refunded: "返金済み",
  manual_review: "要確認",
  returned: "返品済み",
  partially_returned: "一部返品",
};

function normalizeStatus(s?: string | null) {
  if (!s) return "";
  if (s === "preparing") return "picking";
  if (s === "canceled") return "cancelled";
  return s;
}

function formatDateJP(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ToastAction = { label: string; onClick: () => void | Promise<void> };
type ToastState = { message: string; actions?: ToastAction[] };

export default function OrderDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const [status, setStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const [packChecks, setPackChecks] = useState({
    items_ok: false,
    size_ok: false,
    insert_ok: false,
    address_ok: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastBusy, setToastBusy] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (!t) location.href = "/login";
    });
  }, []);

  async function fetchOrder() {
    if (!token || !id) return;

    setLoading(true);
    setErr(null);

    const res = await fetch(`/api/admin/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      await supabaseBrowser.auth.signOut();
      location.href = "/login";
      return;
    }

    if (!res.ok) {
      setErr("注文を取得できませんでした");
      setLoading(false);
      return;
    }

    const json = await res.json();
    const o = (json.order ?? null) as Order | null;
    const its = (json.items ?? []) as Item[];

    setOrder(o);
    setItems(its);

    setStatus(normalizeStatus(o?.status));
    setTrackingNumber(o?.tracking_number ?? "");
    setLoading(false);
  }

  useEffect(() => {
    if (!token || !id) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const qty = typeof it.qty === "number" ? it.qty : 1;
      const unit = typeof it.unit_price === "number" ? it.unit_price : 0;
      return sum + unit * qty;
    }, 0);
  }, [items]);

  const money = useMemo(() => {
    const subtotal = typeof order?.subtotal === "number" ? order.subtotal : itemsSubtotal;
    const shipping = typeof order?.shipping === "number" ? order.shipping : 0;
    const tax = typeof order?.tax === "number" ? order.tax : 0;
    const total = typeof order?.total === "number" ? order.total : subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, currency: order?.currency ?? "JPY" };
  }, [order, itemsSubtotal]);

  const shipLine = useMemo(() => {
    if (!order) return "-";
    const parts = [order.ship_pref, order.ship_city, order.ship_addr1, order.ship_addr2].filter(Boolean);
    return parts.length ? parts.join(" ") : "-";
  }, [order]);

  const canShip = useMemo(() => {
    const from = normalizeStatus(order?.status);
    const tn = (trackingNumber ?? "").trim();
    if (!tn) return false;

    const checksOk =
      packChecks.items_ok &&
      packChecks.size_ok &&
      packChecks.insert_ok &&
      packChecks.address_ok;

    if (!checksOk) return false;

    return ["paid", "picking", "manual_review"].includes(from);
  }, [order?.status, trackingNumber, packChecks]);

  async function patchOrder(body: Record<string, any>) {
    if (!token) return;

    setSaving(true);
    setErr(null);

    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({} as any));
    setSaving(false);

    if (res.status === 401 || res.status === 403) {
      await supabaseBrowser.auth.signOut();
      location.href = "/login";
      return;
    }

    if (!res.ok) {
      setErr(json?.error ?? "更新に失敗しました");
      return;
    }

    const updated = (json.order ?? null) as Order | null;
    if (updated) {
      setOrder(updated);
      setStatus(normalizeStatus(updated.status));
      setTrackingNumber(updated.tracking_number ?? "");
    }
  }

  async function undoShip() {
    if (toastBusy) return;
    setToastBusy(true);
    try {
      await patchOrder({ action: "undo_ship" });
      setToast({
        message: "発送を取り消しました（未発送に戻しました）",
        actions: [
          { label: "未発送へ", onClick: () => void router.push("/admin/orders?tab=open") },
          { label: "この画面に留まる", onClick: () => setToast(null) },
        ],
      });
    } catch {
      setToast({
        message: "Undoできませんでした（時間切れ等）",
        actions: [{ label: "閉じる", onClick: () => setToast(null) }],
      });
    } finally {
      setToastBusy(false);
    }
  }

  // -------------------------
  // 返品（API: /api/admin/orders/:id/return）
  // -------------------------
  async function requestReturn(lines: { variant_id: string; qty: number }[]) {
    if (!token) return;
    if (!id) return;

    setReturnBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lines }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? "返品に失敗しました");

      setToast({
        message: "返品を反映しました",
        actions: [
          { label: "閉じる", onClick: () => setToast(null) },
          { label: "再読み込み", onClick: () => { void fetchOrder(); setToast(null); } },
        ],
      });
    } catch (e: any) {
      setToast({
        message: `返品エラー: ${e?.message ?? e}`,
        actions: [{ label: "閉じる", onClick: () => setToast(null) }],
      });
    } finally {
      setReturnBusy(false);
    }
  }

  const canReturn = useMemo(() => {
    const st = normalizeStatus(order?.status);
    return st === "shipped" || st === "completed" || st === "manual_review";
  }, [order?.status]);

  return (
    <>
      <Head>
        <title>15 管理画面 — 注文詳細</title>
      </Head>

      <main className="aLayout">
        <header className="aTop">
          <Link href="/admin/orders" className="aBack">
            ← 注文一覧
          </Link>

          <div>
            <div className="aKicker">15 管理画面</div>
            <h1 className="aTitle">注文詳細</h1>
            <div className="aSub mono">{id}</div>
          </div>

          <div className="aTopRight">
            <button
              className="aGhost"
              onClick={async () => {
                await supabaseBrowser.auth.signOut();
                location.href = "/login";
              }}
            >
              ログアウト
            </button>
          </div>
        </header>

        {loading ? (
          <div className="aEmpty">読み込み中…</div>
        ) : err ? (
          <div className="aEmpty">{err}</div>
        ) : !order ? (
          <div className="aEmpty">注文が見つかりません</div>
        ) : (
          <div className="aDetailGrid">
            <section className="aPanel">
              <div className="aPanelTitle">商品</div>

              <div className="aItems">
                {items.map((it) => (
                  <div key={it.id} className="aItemRow">
                    <div>
                      <div className="aItemName">{it.product_name ?? "-"}</div>
                      <div className="aItemMeta muted">
                        {it.size_label ? it.size_label : null}
                        {typeof it.qty === "number" ? ` × ${it.qty}` : null}
                      </div>
                    </div>
                    <div className="right mono">
                      {typeof it.unit_price === "number" ? `¥${it.unit_price.toLocaleString()}` : "-"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="aTotal">
                <div className="muted">小計</div>
                <div className="right mono">¥{money.subtotal.toLocaleString()}</div>
                <div className="muted">送料</div>
                <div className="right mono">¥{money.shipping.toLocaleString()}</div>
                <div className="muted">税</div>
                <div className="right mono">¥{money.tax.toLocaleString()}</div>
                <div className="muted">合計</div>
                <div className="right mono">¥{money.total.toLocaleString()}</div>
              </div>

              <div className="aPanelTitle" style={{ marginTop: 18 }}>
                受注情報
              </div>

              <div className="aKv">
                <div className="muted">日時</div>
                <div>{formatDateJP(order.placed_at ?? order.created_at)}</div>
              </div>

              <div className="aKv">
                <div className="muted">ステータス</div>
                <div>
                  <span className={`aPill s-${normalizeStatus(order.status)}`}>
                    {STATUS_LABEL[normalizeStatus(order.status)] ?? order.status ?? "-"}
                  </span>
                </div>
              </div>

              <div className="aKv">
                <div className="muted">Email</div>
                <div>{order.email ?? "-"}</div>
              </div>

              <div className="aKv">
                <div className="muted">氏名</div>
                <div>{order.ship_name ?? "-"}</div>
              </div>

              <div className="aKv">
                <div className="muted">電話</div>
                <div className="mono">{order.ship_phone ?? "-"}</div>
              </div>

              <div className="aKv">
                <div className="muted">郵便</div>
                <div className="mono">{order.ship_postal ?? "-"}</div>
              </div>

              <div className="aKv">
                <div className="muted">住所</div>
                <div>{shipLine}</div>
              </div>
            </section>

            <aside className="aPanel">
              <div className="aPanelTitle">作業</div>

              {/* 梱包開始 */}
              {["paid", "picking", "manual_review"].includes(normalizeStatus(order.status)) ? (
                <button
                  className="aBtn aBtn--ghost"
                  type="button"
                  disabled={saving || normalizeStatus(order.status) === "picking"}
                  onClick={async () => {
                    await patchOrder({ action: "start_picking" });
                  }}
                >
                  {saving ? "処理中…" : normalizeStatus(order.status) === "picking" ? "梱包中" : "梱包を開始する"}
                </button>
              ) : null}

              {/* 梱包チェック */}
              <div className="aPanelTitle" style={{ marginTop: 18 }}>
                梱包チェック
              </div>

              <div className="aField">
                {[
                  ["items_ok", "商品数を確認"],
                  ["size_ok", "サイズ/カラーを確認"],
                  ["insert_ok", "同梱物（カード/ノベルティ）"],
                  ["address_ok", "宛名・住所を確認"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="muted"
                    style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={(packChecks as any)[key]}
                      onChange={(e) => setPackChecks((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {/* ステータス */}
              <div className="aPanelTitle" style={{ marginTop: 18 }}>
                ステータス
              </div>

              <div className="aField">
                <label className="aLabel">状態</label>

                <AdminSelect
                  value={status}
                  onChange={(v) => setStatus(v)}
                  options={[
                    { value: "picking", label: "準備中" },
                    { value: "manual_review", label: "保留" },
                    { value: "shipped", label: "発送（完了）" },
                  ]}
                  placeholder="状態を選択"
                />
              </div>

              {/* 追跡番号 */}
              <div className="aField" style={{ marginTop: 12 }}>
                <label className="aLabel">追跡番号</label>
                <input
                  className="aInput"
                  placeholder="追跡番号を入力（発送完了のとき必須）"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>

              {/* 更新 */}
              <button
                className="aBtn"
                disabled={saving || !status || (normalizeStatus(status) === "shipped" ? !canShip : false)}
                onClick={async () => {
                  const ns = normalizeStatus(status);

                  if (ns === "shipped" && !trackingNumber.trim()) {
                    alert("発送（完了）にするには追跡番号が必要です");
                    return;
                  }

                  await patchOrder({
                    status: ns,
                    tracking_number: trackingNumber.trim() || null,
                  });

                  if (ns === "shipped") {
                    const tn = trackingNumber.trim();
                    setToast({
                      message: tn ? `発送が完了しました（追跡: ${tn}）` : "発送が完了しました",
                      actions: [
                        { label: "Undo", onClick: undoShip },
                        { label: "履歴へ", onClick: () => void router.push("/admin/orders?tab=history") },
                        { label: "未発送へ", onClick: () => void router.push("/admin/orders?tab=open") },
                      ],
                    });
                  } else {
                    setToast({
                      message: "更新しました",
                      actions: [{ label: "閉じる", onClick: () => setToast(null) }],
                    });
                  }
                }}
              >
                {saving ? "保存中…" : "ステータスを更新"}
              </button>

              {/* 返品 */}
              {canReturn ? (
                <>
                  <div className="aPanelTitle" style={{ marginTop: 18 }}>
                    返品
                  </div>

                  <button
                    className="aBtn aBtn--ghost"
                    type="button"
                    disabled={returnBusy}
                    onClick={async () => {
                      const first = items.find((x) => x.variant_id && (x.qty ?? 0) > 0);
                      if (!first?.variant_id) {
                        alert("variant_id が取得できていません（itemsにvariant_idが必要）");
                        return;
                      }
                      await requestReturn([{ variant_id: first.variant_id, qty: 1 }]);
                    }}
                  >
                    {returnBusy ? "返品処理中…" : "先頭アイテムを1点返品（テスト）"}
                  </button>

                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    ※本実装は「返品したい商品/数量」を選べるUIに拡張予定
                  </div>
                </>
              ) : null}
            </aside>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="aToast" role="status" aria-live="polite">
            <span className="aToastIcon" aria-hidden>
              ✓
            </span>

            <div style={{ display: "grid", gap: 8 }}>
              <div>{toast.message}</div>

              {toast.actions && toast.actions.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(toast.actions && toast.actions.length > 0
                    ? toast.actions
                    : [{ label: "閉じる", onClick: () => setToast(null) }]
                  ).map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      className="aBtn aBtn--ghost"
                      disabled={toastBusy}
                      onClick={a.onClick}
                      style={{ padding: "8px 10px", fontSize: 12 }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
