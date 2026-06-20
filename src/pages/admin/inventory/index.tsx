import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Product = { id: string; name: string; is_active?: boolean | null };
type Variant = {
  id: string;
  product_id: string;
  gender?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  is_active?: boolean | null;
};

type InventoryRow = {
  variant_id: string;
  stock_on_hand: number;
  reserved: number;
  updated_at: string;
};

type RowVM = InventoryRow & {
  product_name: string;
  sku: string;
  label: string; // size/color
  available: number;
};

type EventRow = {
  id: string;
  action: string;
  delta: number;
  note: string | null;
  actor_id: string | null;
  created_at: string;
};

async function getAccessToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

function fmtDT(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function InventoryPage() {
  const r = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false); 
  const [lowThreshold, setLowThreshold] = useState<number>(3);
  const [onlyLow3, setOnlyLow3] = useState(false);const LOW_THRESHOLD = 3;

  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [deltaInput, setDeltaInput] = useState<number>(0);
  const [setOnHandInput, setSetOnHandInput] = useState<number>(0);

  // token
  useEffect(() => {
    (async () => {
      const t = await getAccessToken();
      setToken(t);
      if (!t) location.href = "/login";
    })();
  }, []);

  // overview fetch
  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setErr(null);

      const res = await fetch("/api/admin/inventory/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        await supabaseBrowser.auth.signOut();
        location.href = "/login";
        return;
      }

      if (!res.ok) {
        setErr("在庫データを取得できませんでした");
        setLoading(false);
        return;
      }

      const json = await res.json();
      setProducts(json.products ?? []);
      setVariants(json.variants ?? []);
      setInventory(json.inventory ?? []);
      setLoading(false);
    })();
  }, [token]);

  // events fetch for selected
  useEffect(() => {
    if (!token || !selected) return;

    (async () => {
      const res = await fetch(`/api/admin/inventory?variant_id=${encodeURIComponent(selected)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      setEvents((json.events ?? []) as EventRow[]);
    })();
  }, [token, selected, inventory]); // 在庫更新後にログも更新される

  const vm: RowVM[] = useMemo(() => {
    const pById = new Map(products.map((p) => [p.id, p]));
    const vById = new Map(variants.map((v) => [v.id, v]));

    return (inventory ?? []).map((inv) => {
      const v = vById.get(inv.variant_id);
      const p = v ? pById.get(v.product_id) : null;
      const product_name = p?.name ?? "（商品不明）";
      const sku = (v?.sku ?? "").trim() || "-";
      const label = [v?.gender, v?.size, v?.color].filter(Boolean).join(" / ") || "-";
      const available = (inv.stock_on_hand ?? 0) - (inv.reserved ?? 0);
      return { ...inv, product_name, sku, label, available };
    });
  }, [inventory, products, variants]);

  const filtered = useMemo(() => {
    const qTrim = q.trim().toLowerCase();
    return vm.filter((x) => {
    if (onlyLow && x.available > 0) return false;               // 欠品のみ（<=0）
if (onlyLow3 && x.available > LOW_THRESHOLD) return false;  // 低在庫のみ（<=3）

      return (
        x.product_name.toLowerCase().includes(qTrim) ||
        x.sku.toLowerCase().includes(qTrim) ||
        x.variant_id.toLowerCase().includes(qTrim) ||
        x.label.toLowerCase().includes(qTrim)
      );
    });
  }, [vm, q, onlyLow]);

  const selectedRow = useMemo(() => {
    return vm.find((x) => x.variant_id === selected) ?? null;
  }, [vm, selected]);
  const isNegative = (selectedRow?.available ?? 0) < 0;

  async function mutate(body: any) {
    if (!token) return;
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/admin/inventory", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 401 || res.status === 403) {
      await supabaseBrowser.auth.signOut();
      location.href = "/login";
      return;
    }
    if (!res.ok) {
      setErr(json?.error ?? "更新に失敗しました");
      return;
    }

    setInventory(json.inventory ?? []);
    setNote("");
    setDeltaInput(0);
  }

  return (
    <>
      <Head>
        <title>15 管理画面 — 在庫管理</title>
      </Head>

      <main className="aLayout">
        <header className="aTop">
          <div>
            <div className="aKicker">15 管理画面</div>
            <h1 className="aTitle">在庫管理</h1>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              在庫（実棚） / 引当 / 販売可能（在庫−引当）
            </div>
          </div>

          <div className="aTopRight">
            <button className="aGhost" onClick={() => r.push("/admin")}>
              ← ダッシュボード
            </button>
          </div>
        </header>

        {loading ? (
          <div className="aEmpty">読み込み中…</div>
        ) : (
          <div className="aDetailGrid" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
            {/* 左：一覧 */}
            <section className="aPanel">
              <div className="aPanelTitle">在庫一覧</div>

              <div className="aToolbar" style={{ marginTop: 12 }}>
                <input
                  className="aSearch"
                  placeholder="商品名 / SKU / サイズ / Variant ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
  0以下のみ
</label>
<label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <input
    type="checkbox"
    checked={onlyLow3}
    onChange={(e) => setOnlyLow3(e.target.checked)}
  />
  低在庫（3以下）のみ
</label>

              </div>

              <div className="aTableWrap" style={{ marginTop: 12 }}>
                <div className="aTableHead" style={{ gridTemplateColumns: "2fr 1fr .8fr .8fr .8fr 1fr" }}>
                  <div>商品 / バリアント</div>
                  <div>SKU</div>
                  <div className="right">在庫</div>
                  <div className="right">引当</div>
                  <div className="right">販売可</div>
                  <div>更新</div>
                </div>

                {filtered.length === 0 ? (
                  <div className="aEmpty">該当する在庫がありません</div>
                ) : (
                  filtered.map((x) => {
                    const isSel = selected === x.variant_id;
const isOut = x.available <= 0;
const isLow = !isOut && x.available <= LOW_THRESHOLD; // 1〜3


                    return (
                      <button
                        key={x.variant_id}
                        type="button"
                        className="aRow"
                        onClick={() => {
                          setSelected(x.variant_id);
                          setSetOnHandInput(x.stock_on_hand ?? 0);
                        }}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr .8fr .8fr .8fr 1fr",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 10px",
                          borderRadius: 12,
                          border: isSel ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                          background: isSel ? "rgba(255,255,255,.04)" : "transparent",
                        }}
                      >
                        <div>
  <div style={{ fontWeight: 700, display: "flex", gap: 10, alignItems: "center" }}>
    <span className="aStrong">{x.product_name}</span>


{x.available <= 0 ? (
  <span className="aPill s-out">欠品</span>
) : x.available <= lowThreshold ? (
  <span className="aPill s-low">低在庫</span>
) : null}

  </div>

  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
    {x.label} <span className="mono" style={{ opacity: 0.7 }}>• {x.variant_id}</span>
  </div>
</div>


                        <div className="mono muted">{x.sku}</div>
                        <div className="right mono aNum">{x.stock_on_hand}</div>
                        <div className="right mono aNum">{x.reserved}</div>
                       <div className="right mono aNum">{x.available}</div>
                        <div className="muted">{fmtDT(x.updated_at)}</div>
                      </button>
                    );
                  })
                )}
              </div>

              {err ? <div className="aErr" style={{ marginTop: 12 }}>{err}</div> : null}
            </section>

            {/* 右：操作 + ログ */}
            <aside className="aPanel">
              <div className="aPanelTitle">操作</div>

              {!selectedRow ? (
                <div className="aEmpty">左の一覧から在庫を選択してください</div>
              ) : (
                <>
                  <div className="aKv" style={{ marginTop: 10 }}>
                    <div className="muted">商品</div>
                    <div style={{ fontWeight: 700 }}>{selectedRow.product_name}</div>
                  </div>
                  <div className="aKv">
                    <div className="muted">バリアント</div>
                    <div className="muted">{selectedRow.label}</div>
                  </div>
                  <div className="aKv">
                    <div className="muted">SKU</div>
                    <div className="mono">{selectedRow.sku}</div>
                  </div>

                  <div className="aTotal" style={{ marginTop: 12 }}>
                    <div className="muted">在庫</div>
                    <div className="right mono">{selectedRow.stock_on_hand}</div>
                    <div className="muted">引当</div>
                    <div className="right mono">{selectedRow.reserved}</div>
                    <div className="muted">販売可</div>
                    <div className="right mono" style={{ fontWeight: 800 }}>
                      {selectedRow.available}
                    </div>
                  </div>

                  <div className="aPanelTitle" style={{ marginTop: 18 }}>
                    在庫変更（差分）
                  </div>

                  <div className="aField">
                    <label className="aLabel">増減</label>
                    <input
                      className="aInput"
                      type="number"
                      value={deltaInput}
                      onChange={(e) => setDeltaInput(Number(e.target.value))}
                      placeholder="+10 / -2"
                    />
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      例：入荷は +、破損/減算は -
                    </div>
                  </div>

                  <div className="aField" style={{ marginTop: 12 }}>
                    <label className="aLabel">棚卸（実棚）</label>
                    <input
                      className="aInput"
                      type="number"
                      min={0}
                      value={setOnHandInput}
                      onChange={(e) => setSetOnHandInput(Number(e.target.value))}
                      placeholder="実棚数"
                    />
                  </div>

                  <div className="aField" style={{ marginTop: 12 }}>
                    <label className="aLabel">理由メモ</label>
                    <input
                      className="aInput"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="例：入荷/棚卸/破損/調整"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <button
                      className="aBtn"
                      disabled={busy || !deltaInput || !Number.isFinite(deltaInput)}
                      onClick={() =>
                        mutate({
                          action: "adjust",
                          variant_id: selectedRow.variant_id,
                          delta: Math.trunc(deltaInput),
                          note,
                        })
                      }
                    >
                      {busy ? "処理中…" : "増減を反映"}
                    </button>

                    <button
                      className="aBtn aBtn--ghost"
                      disabled={busy || setOnHandInput < 0 || !Number.isFinite(setOnHandInput)}
                      onClick={() =>
                        mutate({
                          action: "set_on_hand",
                          variant_id: selectedRow.variant_id,
                          on_hand: Math.trunc(setOnHandInput),
                          note,
                        })
                      }
                    >
                      実棚で確定
                    </button>
                    <button
  className={`aBtn aBtn--ghost ${isNegative ? "aBtn--danger" : ""}`}
  disabled={busy}
  onClick={() =>
    mutate({
      action: "recalc_reserved",
      variant_id: selectedRow.variant_id,
    })
  }
>
  {isNegative ? "引当を再計算（在庫不足の可能性）" : "引当を再計算"}
</button>

                  </div>

                  <div className="aPanelTitle" style={{ marginTop: 18 }}>
                    直近ログ
                  </div>

                  {events.length === 0 ? (
                    <div className="aEmpty">ログがありません</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {events.slice(0, 10).map((e) => (
                        <div key={e.id} className="aCard" style={{ padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {fmtDT(e.created_at)}
                            </div>
                            <div className="mono" style={{ fontWeight: 800 }}>
                              {e.delta > 0 ? `+${e.delta}` : `${e.delta}`}
                            </div>
                          </div>
                          <div style={{ marginTop: 6, fontWeight: 700 }}>
                            {e.action}
                          </div>
                          <div className="muted" style={{ marginTop: 6 }}>
                            {e.note ?? "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
