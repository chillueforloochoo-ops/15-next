// src/pages/bag.tsx
import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useCart } from "@/contexts/CartContext";
import { formatJPY } from "@/lib/cart";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  size: string;
};

export default function BagPage() {
  const { items, updateQty, removeItem } = useCart() as any;
  const bagItems: CartItem[] = (items ?? []) as CartItem[];

  const [checkingOut, setCheckingOut] = useState(false);

  // ✅ unmount（/bag から離れる）時に qty=0 を掃除したいので、最新itemsをrefで保持
  const itemsRef = useRef<CartItem[]>(bagItems);
  useEffect(() => {
    itemsRef.current = bagItems;
  }, [bagItems]);

  // ✅ /bag を離れた瞬間に qty=0 を削除（=「移動したら消える」）
  useEffect(() => {
    return () => {
      (itemsRef.current ?? []).forEach((it) => {
        if (Number(it.qty) <= 0) removeItem(it.id, it.size);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 表示：0も含めて残す
  const visibleItems = useMemo(() => bagItems, [bagItems]);

  // チェックアウト：qty>0のみ
  const checkoutItems = useMemo(
    () => bagItems.filter((it) => Number(it.qty) > 0),
    [bagItems]
  );

  const totalQty = useMemo(
    () =>
      checkoutItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0),
    [checkoutItems]
  );

  // ✅ 小計も qty>0 だけで計算（0の行は除外）
  const displaySubtotal = useMemo(() => {
    return checkoutItems.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.qty || 0),
      0
    );
  }, [checkoutItems]);

  // −：0まで落とす（カードは残る）
  const onMinus = (it: CartItem) => {
    const next = (Number(it.qty) || 0) - 1;
    updateQty(it.id, it.size, Math.max(0, next));
  };

  // ＋：復活
  const onPlus = (it: CartItem) => {
    const next = (Number(it.qty) || 0) + 1;
    updateQty(it.id, it.size, next);
  };

  const goToStripeCheckout = async () => {
    if (checkingOut || checkoutItems.length === 0) return;

    setCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed");

      if (typeof data?.url === "string") {
        window.location.assign(data.url);
      } else {
        throw new Error("Stripe URL が取得できませんでした。");
      }
    } catch (e: any) {
      alert(e?.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <Head>
        <title>BAG | 15 — Okinawa Art Apparel</title>
      </Head>

      <div className="bagPage">
        <SiteHeader />

        <main className="bagMain">
          {/* ===== TOP ===== */}
          <div className="bagTop">
            <h1 className="bagTitle">
              BAG <span className="bagTitleJa">ショッピングバッグ</span>
            </h1>
            <div className="bagMeta">
              {totalQty ? `${totalQty} item(s) / ${totalQty} 点` : "—"}
            </div>
          </div>

          {/* ===== EMPTY ===== */}
          {visibleItems.length === 0 ? (
            <div className="bagEmpty">
              <p className="bagEmptyText">
                Your bag is empty.
                <span className="ja">商品が入っていません</span>
              </p>
              <Link className="bagEmptyCta" href="/#category">
                Continue shopping
                <span className="ja">買い物を続ける</span>
              </Link>
            </div>
          ) : (
            <div className="bagLayout">
              {/* ===== LEFT : ITEMS ===== */}
              <section className="bagList" aria-label="Items">
                {visibleItems.map((it) => {
                  const isRemoved = Number(it.qty) === 0;

                  return (
                    <article
                      key={`${it.id}-${it.size}`}
                      className={`bagItem ${isRemoved ? "is-removed" : ""}`}
                    >
                      <Link
                        className="bagThumb"
                        href={`/tshirt/${it.id}`}
                        aria-disabled={isRemoved}
                        tabIndex={isRemoved ? -1 : 0}
                        onClick={(e) => {
                          if (isRemoved) e.preventDefault();
                        }}
                      >
                        <img src={it.image} alt={it.name} />
                      </Link>

                      <div className="bagInfo">
                        <div className="bagRow1">
                          <div className="bagName">{it.name}</div>
                          <div className="bagPrice">
                            {isRemoved ? (
                              <span className="muted">—</span>
                            ) : (
                              formatJPY(it.price * it.qty)
                            )}
                          </div>
                        </div>

                        <div className="bagRow2">
                          <div className="bagSub">
                            <span className="bagTag">
                              {it.slug?.toUpperCase?.() ?? "ITEM"}
                            </span>
                            <span className="bagDot">•</span>
                            <span className="bagTag">SIZE {it.size}</span>

                            {isRemoved ? (
                              <>
                                <span className="bagDot">•</span>
                                <span className="bagRemovedTag">
                                  REMOVED<span className="ja">削除済み</span>
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="bagRow3">
                          <div className="bagQty" aria-label="Quantity controls">
                            {/* −：qty=0のとき無効 */}
                            <button
                              type="button"
                              className="bagQtyBtn"
                              onClick={() => onMinus(it)}
                              aria-label="Decrease quantity"
                              disabled={isRemoved}
                            >
                              −
                            </button>

                            <span className="bagQtyVal">{it.qty}</span>

                            {/* ＋：qty=0のとき強調（復活感） */}
                            <button
                              type="button"
                              className={`bagQtyBtn bagQtyPlus ${
                                isRemoved ? "is-revive" : ""
                              }`}
                              onClick={() => onPlus(it)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <div className="bagUnit muted">
                            Unit {formatJPY(it.price)}
                            <span className="ja">（単価）</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* ===== RIGHT : SUMMARY ===== */}
              <aside className="bagSummary" aria-label="Summary">
                <div className="sumCard">
                  <div className="sumRow">
                    <span className="muted">
                      Subtotal <span className="ja">小計</span>
                    </span>
                    <span className="sumVal">{formatJPY(displaySubtotal)}</span>
                  </div>

                  <div className="sumRow">
                    <span className="muted">
                      Shipping <span className="ja">送料</span>
                    </span>
                    <span className="sumVal muted">チェックアウト時に計算</span>
                  </div>

                  <button
                    type="button"
                    className="sumCta"
                    onClick={goToStripeCheckout}
                    disabled={checkingOut || checkoutItems.length === 0}
                  >
                    {checkingOut ? "PROCESSING..." : "CHECKOUT"}
                    <span className="sumCtaJa">購入手続きへ</span>
                  </button>

                  <Link href="/#category" className="sumLink">
                    Continue shopping
                    <span className="ja">買い物を続ける</span>
                  </Link>

                  <p className="sumNote">
                    Payment & shipping address are entered securely on Stripe.
                    <br />
                    <span className="ja">お支払い情報はStripeで安全に入力されます</span>
                  </p>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
