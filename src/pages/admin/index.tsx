import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

async function fetchAdminJSON(url: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

type DashboardRes = {
  kpi?: {
    orders_7d?: number;
    revenue_7d?: number;
    unpaid_or_processing?: number;
    paid_unshipped?: number;
  };
  inventory?: { zero?: number; low?: number };
  top_skus_7d?: Array<{ sku?: string; name?: string; qty?: number; thumb_url?: string | null }>;

  // ★追加
  todo?: {
    unshipped_count?: number;
    unshipped?: Array<{
      id: string;
      created_at: string;
      status: string;
      thumb_url: string | null;
    }>;
  };
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  fulfillment_stage?: string | null; // ★これを追加
  amount_total?: number;
  email?: string;
  thumb_url?: string | null;
  items?: { product_name?: string | null }[] | null;
};
const STAGE_LABEL: Record<string, string> = {
  make: "制作",
  pack: "梱包",
  ship: "発送",
  hold: "保留",
};

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DashboardRes | null>(null);

  // ---- Unshipped (paid) expandable list ----
  const [unshipOpen, setUnshipOpen] = useState(false);
  const [unshipLoading, setUnshipLoading] = useState(false);
  const [unshipErr, setUnshipErr] = useState<string | null>(null);
  const [unshipItems, setUnshipItems] = useState<Order[]>([]);
  const unshipLoadedOnceRef = useRef(false);
  const unshipAbortRef = useRef<AbortController | null>(null);

  // セッション取得 → token
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (!t) location.href = "/login";
    });
  }, []);

  // adminチェック + dashboard取得
  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setErr(null);

      const me = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!me.ok) {
        await supabaseBrowser.auth.signOut();
        location.href = "/login";
        return;
      }

      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setErr("データを取得できませんでした");
        setLoading(false);
        return;
      }

      const json = (await res.json()) as DashboardRes;
      setData(json);
      setLoading(false);
    })();
  }, [token]);

 const kpi = data?.kpi ?? {};
const inv = data?.inventory ?? {};
const top = data?.top_skus_7d ?? [];
const todo = data?.todo ?? {}; // ★追加（任意だけど読みやすい）

// ★未発送数は todo.unshipped_count を正として使う
// 互換のため、todo が無い場合だけ kpi.paid_unshipped にフォールバック
const unshippedCount =
  typeof todo.unshipped_count === "number"
    ? todo.unshipped_count
    : typeof kpi.paid_unshipped === "number"
    ? kpi.paid_unshipped
    : 0;


  const fetchUnshipped = async (opts?: { force?: boolean }) => {
    if (!token) return;
    if (!opts?.force && unshipLoadedOnceRef.current) return;

    // cancel prev
    unshipAbortRef.current?.abort();
    const ac = new AbortController();
    unshipAbortRef.current = ac;

    setUnshipLoading(true);
    setUnshipErr(null);

    try {
      // 「未発送」= いまは paid 扱い（後で picking に変えたらここも変える）
  const res = await fetch(
  `/api/admin/orders?status=paid,picking&shipped=0&limit=10`,
  {
    headers: { Authorization: `Bearer ${token}` },
    signal: ac.signal,
  }
);


      if (res.status === 401 || res.status === 403) {
        await supabaseBrowser.auth.signOut();
        location.href = "/login";
        return;
      }

      if (!res.ok) {
        setUnshipErr("未発送一覧を取得できませんでした");
        setUnshipLoading(false);
        return;
      }

      const json = await res.json();
      setUnshipItems((json.items ?? []) as Order[]);
      unshipLoadedOnceRef.current = true;
      setUnshipLoading(false);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setUnshipErr("未発送一覧の取得に失敗しました");
      setUnshipLoading(false);
    }
  };

  // 開いた瞬間だけロード（初回のみ）
  useEffect(() => {
    if (!unshipOpen) return;
    fetchUnshipped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unshipOpen, token]);

  const thumbs = useMemo(() => {
    // 上位3件だけサムネ
    return unshipItems.slice(0, 3);
  }, [unshipItems]);

  return (
    <>
      <Head>
        <title>15 管理画面 — ダッシュボード</title>
      </Head>

      <main className="aLayout">
        <header className="aTop">
          <div>
            <div className="aKicker">15 管理画面</div>
            <h1 className="aTitle">ダッシュボード</h1>
            <p className="aSub">今日やることが一瞬で分かる</p>
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

        {/* クイック導線 */}
        <section className="aDashNav">
          <Link className="aNavCard" href="/admin/orders">
            <div className="aNavTitle">注文管理</div>
            <div className="aNavSub">一覧・詳細・ステータス</div>
          </Link>

          <Link className="aNavCard" href="/admin/inventory">
            <div className="aNavTitle">在庫管理</div>
            <div className="aNavSub">残り / 予約 / 低在庫</div>
          </Link>
        </section>

        {loading ? (
          <div className="aEmpty">読み込み中…</div>
        ) : err ? (
          <div className="aEmpty">{err}</div>
        ) : (
          <>
            {/* 上段：KPI */}
            <section className="aDashGrid">
              <div className="aPanel">
                <div className="aPanelTitle">直近7日</div>
                <div className="aKpiRow">
                  <div className="aKpi">
                    <div className="aKpiLabel">注文数</div>
                    <div className="aKpiValue">{kpi.orders_7d ?? "-"}</div>
                  </div>
                  <div className="aKpi">
                    <div className="aKpiLabel">売上</div>
                    <div className="aKpiValue">
                      {typeof kpi.revenue_7d === "number"
                        ? `¥${kpi.revenue_7d.toLocaleString()}`
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="aPanel">
                <div className="aPanelTitle">対応が必要</div>
                <div className="aKpiRow">
                  <div className="aKpi">
                    <div className="aKpiLabel">未払い/処理中</div>
                    <div className="aKpiValue">{kpi.unpaid_or_processing ?? "-"}</div>
                  </div>
                  <div className="aKpi">
                    <div className="aKpiLabel">支払い済/未発送</div>
                    <div className="aKpiValue">{kpi.paid_unshipped ?? "-"}</div>
                  </div>
                </div>
              </div>

              <div className="aPanel">
                <div className="aPanelTitle">在庫</div>
                <div className="aKpiRow">
                  <div className="aKpi">
                    <div className="aKpiLabel">在庫0</div>
                    <div className="aKpiValue">{inv.zero ?? "-"}</div>
                  </div>
                  <div className="aKpi">
                    <div className="aKpiLabel">低在庫</div>
                    <div className="aKpiValue">{inv.low ?? "-"}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 中段：Todoカード（2枚構成） */}
            <section className="aMidGrid" style={{ marginTop: 14 }}>
              {/* 未発送 */}
              <section className="aTodoCard">
                <div className="aTodoHead">
                  <div>
                    <div className="aTodoTitle">未発送</div>
                    <div className="aTodoSub">梱包して発送へ</div>
                  </div>

                  <div className="aTodoRight">
                    <div className="aTodoCount">{unshippedCount}</div>
                    <button
                      className="aGhost aGhost--sm"
                      type="button"
                      aria-expanded={unshipOpen}
                      onClick={() => setUnshipOpen((v) => !v)}
                    >
                      {unshipOpen ? "閉じる" : "一覧を見る"}
                    </button>
                  </div>
                </div>

                {/* サムネ（上位3件） */}
                <div className="aTodoThumbs" aria-hidden>
                  {thumbs.length === 0 ? (
                    <>
                      <div className="aThumbPh" />
                      <div className="aThumbPh" />
                      <div className="aThumbPh" />
                    </>
                  ) : (
                    thumbs.map((o) => (
                      <div className="orderThumb aTodoThumb" key={o.id}>
                        {o.thumb_url ? <img src={o.thumb_url} alt="" /> : <div className="orderThumbPh" />}
                      </div>
                    ))
                  )}
                </div>

                {/* 展開リスト */}
                {unshipOpen ? (
                  <div className="aTodoExpand">
                    <div className="aTodoExpandTop">
                      <div className="muted">直近の未発送（最大10件）</div>
                      <button
                        className="aGhost aGhost--sm"
                        type="button"
                        disabled={unshipLoading}
                        onClick={() => fetchUnshipped({ force: true })}
                      >
                        {unshipLoading ? "更新中…" : "更新"}
                      </button>
                    </div>

                    {unshipLoading ? (
                      <div className="aEmpty">読み込み中…</div>
                    ) : unshipErr ? (
                      <div className="aEmpty">{unshipErr}</div>
                    ) : unshipItems.length === 0 ? (
                      <div className="aEmpty">未発送はありません</div>
                    ) : (
                      <div className="aTodoList">
                        {unshipItems.map((o) => (
                          <Link
                            key={o.id}
                            href={`/admin/orders/${o.id}`}
                            className="aTodoRow"
                            title="注文詳細へ"
                          >
                            <div className="orderThumb">
                              {o.thumb_url ? <img src={o.thumb_url} alt="" /> : <div className="orderThumbPh" />}
                            </div>

                            <div className="aTodoMain">
  {/* 商品名（メイン） */}
  <div className="aTodoTitle">
    {o.items?.[0]?.product_name ?? "（商品名不明）"}
  </div>

  {/* メタ情報：メール / 日時 */}
  <div className="aTodoMeta muted">
    {o.email ?? "-"}
    <span className="aDot">•</span>
    {o.created_at ? new Date(o.created_at).toLocaleString() : "-"}
  </div>
</div>

<div className="aTodoGo muted">→</div>

                          </Link>
                        ))}

                        <div className="aTodoFooter">
                          <Link className="aTodoCta" href="/admin/orders?status=paid">
                            未発送一覧へ →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aTodoFoot">
                    <Link className="aTodoCta" href="/admin/orders?status=paid">
                      未発送一覧へ →
                    </Link>
                  </div>
                )}
              </section>

              {/* 在庫アラート（今回は既存の数だけ表示・詳細は後で） */}
              <section className="aTodoCard">
                <div className="aTodoHead">
                  <div>
                    <div className="aTodoTitle">在庫アラート</div>
                    <div className="aTodoSub">欠品/低在庫を確認</div>
                  </div>
                  <div className="aTodoRight">
                    <div className="aTodoCount">{(inv.zero ?? 0) + (inv.low ?? 0)}</div>
                  </div>
                </div>

                <div className="aTodoBadges">
                  <span className="aBadge">在庫0 {inv.zero ?? "-"}</span>
                  <span className="aBadge">低在庫 {inv.low ?? "-"}</span>
                </div>

                <div className="aTodoFoot">
                  <Link className="aTodoCta" href="/admin/inventory">
                    在庫管理へ →
                  </Link>
                  <div className="muted">補充・予約・残数チェック</div>
                </div>
              </section>
            </section>

            {/* 下段：売れたSKU */}
            <section className="aPanel" style={{ marginTop: 14 }}>
              <div className="aPanelTitle">売れたSKU（直近7日）</div>

              {top.length === 0 ? (
                <div className="aEmpty">データがありません</div>
              ) : (
                <div className="aTopSkuList">
                  {top.map((x, i) => (
                    <div className="aTopSkuRow" key={`${x.sku ?? i}`}>
                      <div className="orderThumb">
                        {x.thumb_url ? <img src={x.thumb_url} alt="" /> : <div className="orderThumbPh" />}
                      </div>
                      <div className="aTopSkuMain">
                        <div className="aTopSkuName">{x.name ?? x.sku ?? "-"}</div>
                        <div className="aTopSkuMeta muted">{x.sku ?? ""}</div>
                      </div>
                      <div className="aTopSkuQty right">{x.qty ?? "-"}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
