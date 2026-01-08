// src/pages/checkout.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import SiteHeader from "@/components/SiteHeader";
import { useCart } from "@/contexts/CartContext";
import { formatJPY } from "@/lib/cart";

type FormState = {
  email: string;
  lastName: string;
  firstName: string;
  phone: string;
  postal: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  note: string;
};

const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal } = useCart();

  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [lastZip, setLastZip] = useState("");

  const [form, setForm] = useState<FormState>({
    email: "",
    lastName: "",
    firstName: "",
    phone: "",
    postal: "",
    prefecture: "沖縄県",
    city: "",
    address1: "",
    address2: "",
    note: "",
  });

  // カートが空なら /bag へ
  useEffect(() => {
    if (items.length === 0) router.replace("/bag");
  }, [items.length, router]);

  const shippingLabel = useMemo(() => "Calculated at payment", []);
  const totalLabel = useMemo(() => formatJPY(subtotal), [subtotal]);

  const onChange =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
    };

  // 郵便番号：数字だけ・7桁まで
  const normalizeZip = (v: string) => v.replace(/[^\d]/g, "").slice(0, 7);

  // 郵便番号 → 住所自動入力（zipcloud）
  const lookupZip = async (zipRaw: string) => {
    const zip = normalizeZip(zipRaw);
    if (zip.length !== 7) return;
    if (zip === lastZip) return;

    setLastZip(zip);
    setZipLoading(true);
    setZipError(null);

    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
      const data = await res.json();

      if (!data || data.status !== 200 || !data.results?.length) {
        setZipError("郵便番号から住所が見つかりませんでした。");
        return;
      }

      const r = data.results[0];
      setForm((p) => ({
        ...p,
        postal: zip,
        prefecture: r.address1 ?? p.prefecture,
        city: `${r.address2 ?? ""}${r.address3 ?? ""}`.trim() || p.city,
      }));
    } catch {
      setZipError("住所の自動入力に失敗しました。");
    } finally {
      setZipLoading(false);
    }
  };

  const isValid =
    form.email &&
    form.lastName &&
    form.firstName &&
    form.phone &&
    form.postal &&
    form.prefecture &&
    form.city &&
    form.address1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customer: form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");

      const url = data?.url;
      if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
        console.error("Invalid url from API:", data);
        throw new Error("Stripe URL が取得できませんでした。");
      }

      window.location.assign(url);
    } catch (err: any) {
      alert(err?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>CHECKOUT | 15 — Okinawa Art Apparel</title>
      </Head>

      <div className="coPage">
        <SiteHeader />

        <main className="coMain">
          <nav className="coCrumb" aria-label="Breadcrumb">
            <Link href="/bag">BAG</Link>
            <span className="coSep">/</span>
            <span aria-current="page">CHECKOUT</span>
          </nav>

          <div className="coLayout">
            {/* LEFT: form */}
            <div className="coForm" aria-label="Checkout form">
              <h1 className="coTitle">CHECKOUT</h1>

              <div className="coGate">
                <div className="coGateTitle">
                  Faster next time <em className="coKana">アカウント作成で次回からスムーズに</em>
                </div>

                <div className="coGateBody">
                  <button
                    type="button"
                    className="coGhostBtn"
                    onClick={() => alert("次ステップで /account を実装します")}
                  >
                    Sign in / Create account
                    <span className="coBtnKana">ログイン／アカウント作成</span>
                  </button>

                  <div className="coGateNote">またはゲスト購入</div>
                </div>
              </div>

              <form onSubmit={onSubmit} className="coFields">
                <div className="coBlock">
                  <div className="coBlockTitle">Contact</div>

                  <label className="coField">
                    <span>
                      Email <em className="coKana">メール</em>
                    </span>
                    <input
                      value={form.email}
                      onChange={onChange("email")}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                </div>

                <div className="coBlock">
                  <div className="coBlockTitle">Shipping</div>

                  <div className="coGrid2">
                    <label className="coField">
                      <span>
                        Last name <em className="coKana">セイ</em>
                      </span>
                      <input
                        value={form.lastName}
                        onChange={onChange("lastName")}
                        autoComplete="family-name"
                        required
                      />
                    </label>

                    <label className="coField">
                      <span>
                        First name <em className="coKana">メイ</em>
                      </span>
                      <input
                        value={form.firstName}
                        onChange={onChange("firstName")}
                        autoComplete="given-name"
                        required
                      />
                    </label>
                  </div>

                  <label className="coField">
                    <span>
                      Phone <em className="coKana">電話番号</em>
                    </span>
                    <input
                      value={form.phone}
                      onChange={onChange("phone")}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="090-xxxx-xxxx"
                      required
                    />
                  </label>

                  <div className="coGrid2">
                    <label className="coField">
                      <span>
                        Postal code <em className="coKana">郵便番号</em>
                      </span>
                      <input
                        value={form.postal}
                        onChange={(e) => {
                          const zip = normalizeZip(e.target.value);
                          setForm((p) => ({ ...p, postal: zip }));
                          if (zip.length === 7) lookupZip(zip);
                        }}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="901xxxx"
                        required
                      />
                      <div className="coHint">
                        {zipLoading
                          ? "住所を自動入力中…"
                          : zipError
                          ? zipError
                          : "7桁で住所が自動入力されます"}
                      </div>
                    </label>

                    <label className="coField">
                      <span>
                        Prefecture <em className="coKana">都道府県</em>
                      </span>
                      <select value={form.prefecture} onChange={onChange("prefecture")} required>
                        {PREFS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="coField">
                    <span>
                      City <em className="coKana">市町村</em>
                    </span>
                    <input
                      value={form.city}
                      onChange={onChange("city")}
                      autoComplete="address-level2"
                      required
                    />
                  </label>

                  <label className="coField">
                    <span>
                      Address <em className="coKana">番地/建物名</em>
                    </span>
                    <input
                      value={form.address1}
                      onChange={onChange("address1")}
                      autoComplete="street-address"
                      placeholder="番地・建物名"
                      required
                    />
                  </label>

                  <label className="coField">
                    <span>
                      Address (optional) <em className="coKana">部屋番号</em>
                    </span>
                    <input
                      value={form.address2}
                      onChange={onChange("address2")}
                      placeholder="部屋番号など"
                    />
                  </label>

                  <label className="coField">
                    <span>
                      Note (optional) <em className="coKana">メモ</em>
                    </span>
                    <textarea
                      value={form.note}
                      onChange={onChange("note")}
                      rows={3}
                      placeholder="配送に関するメモ"
                    />
                  </label>
                </div>

                <button className="coPayBtn" type="submit" disabled={!isValid || loading}>
                  {loading ? "PROCESSING..." : "PROCEED TO PAYMENT"}
                </button>

                <p className="coFoot">
                  お支払い情報（カード番号）はこのページでは扱わず、次画面の Stripe 決済で安全に入力します。
                </p>
              </form>
            </div>

            {/* RIGHT: summary */}
            <aside className="coSummary" aria-label="Order summary">
              <div className="coSumCard">
                <div className="coSumTitle">Summary</div>

                <div className="coLineList">
                  {items.map((it) => (
                    <div key={`${it.id}-${it.size}`} className="coLine">
                      <div className="coLineThumb">
                        <img src={it.image} alt={it.name} />
                        <span className="coQty">{it.qty}</span>
                      </div>

                      <div className="coLineInfo">
                        <div className="coLineName">{it.name}</div>
                        <div className="coLineMeta">
                          {it.slug.toUpperCase()} • SIZE {it.size}
                        </div>
                      </div>

                      <div className="coLinePrice">{formatJPY(it.price * it.qty)}</div>
                    </div>
                  ))}
                </div>

                <div className="coSumRows">
                  <div className="coSumRow">
                    <span className="muted">Subtotal</span>
                    <span>{formatJPY(subtotal)}</span>
                  </div>
                  <div className="coSumRow">
                    <span className="muted">Shipping</span>
                    <span className="muted">{shippingLabel}</span>
                  </div>
                  <div className="coSumRow coSumTotal">
                    <span>Total</span>
                    <span>{totalLabel}</span>
                  </div>
                </div>

                <Link className="coBack" href="/bag">
                  ← Back to bag
                </Link>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
