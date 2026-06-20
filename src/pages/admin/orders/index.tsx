// src/pages/admin/orders/index.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  amount_total: number;
  thumb_url: string | null;

  email?: string | null;
  fulfillment_stage?: string | null;
  product_name?: string | null;
  items_qty?: number | null;

  ship_postal?: string | null;
  ship_summary?: string | null;
  ship_name?: string | null;

  shipped_at?: string | null;
  tracking_number?: string | null;
  last_event_at?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  paid: "支払い済み",
  picking: "準備中",
  preparing: "準備中",
  shipped: "発送済み",
  completed: "完了",
  cancelled: "キャンセル",
  canceled: "キャンセル",
  refunded: "返金済み",
  manual_review: "要確認",
};

const STAGE_LABEL: Record<string, string> = {
  make: "制作から",
  pack: "梱包から",
  ship: "発送へ",
  hold: "保留",
};

function formatDateJP(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskTracking(t?: string | null) {
  const s = String(t ?? "").trim();
  if (!s) return "-";
  if (s.length <= 6) return s;
  return `…${s.slice(-6)}`;
}

function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data?.session?.access_token ?? null;
}

export default function OrdersPage() {
  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<OrderRow[]>([]);
  const [count, setCount] = useState(0);

  const [tab, setTab] = useState<"open" | "history">("open");

  // filters
  const [q, setQ] = useState("");
  const qDebounced = useDebounce(q, 350);

  // (履歴でのみ使う想定 / openでは主役じゃないので隠す運用)
  const [status, setStatus] = useState<string>(""); // "" = 指定なし
  const [stage, setStage] = useState<string>(""); // "" = 指定なし

  // ✅ open 作業用フィルタ（チェックボックス）
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyHold, setOnlyHold] = useState(false);
  const [trackingMissing, setTrackingMissing] = useState(false);
  const [minTotal10k, setMinTotal10k] = useState(false);

  // ✅ 履歴の期間
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // paging/sort
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<"created_at" | "status" | "amount_total" | "shipped_at">("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      const t = await getAccessToken();
      setToken(t);
      if (!t) location.href = "/login";
    })();
  }, []);

  // tab切替初期化
  useEffect(() => {
    setOffset(0);

    if (tab === "history") {
      setSort("shipped_at");
      setDir("desc");
      setStatus("");
      // open用チェックは履歴では不要
      setOnlyToday(false);
      setOnlyHold(false);
      setTrackingMissing(false);
      setMinTotal10k(false);
    } else {
      setSort("created_at");
      setDir("desc");
      // 履歴の期間はopenでは邪魔なのでクリア
      setFrom("");
      setTo("");
    }
  }, [tab]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    p.set("sort", sort);
    p.set("dir", dir);
    p.set("tab", tab);

    if (qDebounced.trim()) p.set("q", qDebounced.trim());

    // ✅ open はチェックを主役にする（status/stageは必要なら後で復活）
    if (tab === "history") {
      if (status) p.set("status", status);
      if (stage) p.set("stage", stage);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    } else {
      if (onlyToday) p.set("today", "1");
      if (onlyHold) p.set("hold_only", "1");
      if (trackingMissing) p.set("tracking_missing", "1");
      if (minTotal10k) p.set("min_total", "10000");
    }

    return p.toString();
  }, [
    limit,
    offset,
    sort,
    dir,
    tab,
    qDebounced,
    status,
    stage,
    from,
    to,
    onlyToday,
    onlyHold,
    trackingMissing,
    minTotal10k,
  ]);

  useEffect(() => {
    if (!token) return;

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/admin/orders?${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
        });

        if (res.status === 401 || res.status === 403) {
          await supabaseBrowser.auth.signOut();
          location.href = "/login";
          return;
        }

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          setErr(`取得に失敗しました (${res.status}) ${t}`);
          setItems([]);
          setCount(0);
          setLoading(false);
          return;
        }

        const json = (await res.json()) as { items: OrderRow[]; count: number };
        setItems(json.items ?? []);
        setCount(Number(json.count ?? 0));
        setLoading(false);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setErr("取得に失敗しました");
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [token, queryString]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(count / limit));

  async function downloadCsv() {
    if (!token) return;
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);

    const res = await fetch(`/api/admin/orders/export?${p.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`CSV出力に失敗しました (${res.status}) ${t}`);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_history_${from || "all"}_${to || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Head>
        <title>注文一覧</title>
      </Head>

      <main className="adminRoot">
        <Link href="/admin" className="aBackLink">
          ← ダッシュボードに戻る
        </Link>

        <h1 className="aTitle">注文一覧</h1>

        {/* Tabs */}
        <div className="aTabs" style={{ display: "flex", gap: 10, margin: "16px 0 20px" }}>
          <button
            type="button"
            className={`aTab ${tab === "open" ? "isActive" : ""}`}
            onClick={() => {
              setTab("open");
              setOffset(0);
            }}
          >
            未発送
          </button>

          <button
            type="button"
            className={`aTab ${tab === "history" ? "isActive" : ""}`}
            onClick={() => {
              setTab("history");
              setOffset(0);
            }}
          >
            履歴
          </button>
        </div>

        {/* toolbar */}
        <div className="aToolbar" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="aSearch"
            placeholder="メール / セッションID / 注文ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {/* ✅ 未発送：作業用チェック */}
          {tab === "open" ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {[
                ["today", "今日の注文のみ", onlyToday, setOnlyToday],
                ["hold", "保留のみ", onlyHold, setOnlyHold],
                ["tn", "追跡番号未入力", trackingMissing, setTrackingMissing],
                ["10k", "金額1万円以上", minTotal10k, setMinTotal10k],
              ].map(([key, label, v, setV]) => (
                <label key={String(key)} className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    onChange={(e) => (setV as any)(e.target.checked)}
                  />
                  <span>{String(label)}</span>
                </label>
              ))}
            </div>
          ) : null}

          {/* ✅ 履歴：期間＋CSV（必要最小） */}
          {tab === "history" ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                期間
              </div>
              <input type="date" className="aInput" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
              <span className="muted" style={{ fontSize: 12 }}>
                〜
              </span>
              <input type="date" className="aInput" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />

              <button className="aBtn aBtn--ghost" type="button" onClick={downloadCsv}>
                CSV出力
              </button>
            </div>
          ) : null}
        </div>

        {/* table */}
        <section className="aTableWrap">
          <div className="aTableHead aRow--withThumb">
            <div></div>
            <div>商品</div>
            <div>{tab === "history" ? "発送" : "日時"}</div>
            <div>{tab === "history" ? "最終更新" : "ステージ"}</div>
            <div>{tab === "history" ? "追跡" : "状態"}</div>
            <div>住所</div>
            <div className="right">金額</div>
          </div>

          {err ? <div className="aEmpty">{err}</div> : null}

          {loading ? (
            <div className="aEmpty">読み込み中…</div>
          ) : items.length === 0 ? (
            <div className="aEmpty">注文がありません</div>
          ) : (
            items.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="aRow aRow--withThumb">
                <div className="orderThumb">
                  {o.thumb_url ? <img src={o.thumb_url} alt="" /> : <div className="orderThumbPh" />}
                </div>

                <div>
                  <div style={{ fontWeight: 600 }}>
                    {o.product_name ? o.product_name : "（商品不明）"}
                    {typeof o.items_qty === "number" && o.items_qty > 0 ? ` ×${o.items_qty}` : ""}
                  </div>

                  <div className="muted" style={{ marginTop: 4, fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{o.email ?? "-"}</span>
                    <span className="aDot">•</span>
                    <span className="aStagePill">{STATUS_LABEL[o.status] ?? o.status ?? "-"}</span>
                    {o.ship_name ? (
                      <>
                        <span className="aDot">•</span>
                        <span>{o.ship_name}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div>{tab === "history" ? formatDateJP(o.shipped_at ?? null) : formatDateJP(o.created_at)}</div>

                <div className="muted">
                  {tab === "history"
                    ? formatDateJP(o.last_event_at ?? null)
                    : STAGE_LABEL[o.fulfillment_stage ?? ""] ?? (o.fulfillment_stage ?? "-")}
                </div>

                <div>
                  {tab === "history" ? (
                    <span className="mono">{maskTracking(o.tracking_number ?? null)}</span>
                  ) : (
                    <span className={`aPill s-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                  )}
                </div>

                <div className="muted">
                  {o.ship_summary
                    ? `${o.ship_summary}${o.ship_postal ? ` (${o.ship_postal})` : ""}`
                    : o.ship_postal
                    ? `(${o.ship_postal})`
                    : "-"}
                </div>

                <div className="right">{typeof o.amount_total === "number" ? `¥${o.amount_total.toLocaleString()}` : "-"}</div>
              </Link>
            ))
          )}
        </section>

        <div className="aToolbar" style={{ justifyContent: "space-between" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {count.toLocaleString()}件 / {page} / {totalPages}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="aBtn aBtn--ghost" disabled={offset <= 0} onClick={() => setOffset((v) => Math.max(0, v - limit))}>
              前へ
            </button>
            <button className="aBtn aBtn--ghost" disabled={offset + limit >= count} onClick={() => setOffset((v) => v + limit)}>
              次へ
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
