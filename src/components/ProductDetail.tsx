import Link from "next/link";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import type { ProductDetail } from "@/lib/products";

type BackHref = {
  pathname: string;
  query: Record<string, string>;
};

type Props = {
  categoryKey: string;        // cartに入れる slug 用（"shirt" など）
  categoryLabel: string;      // 表示用（"SHIRT" など）
  backHref: BackHref;         // パンくず戻り先
  product: ProductDetail;
};

export default function ProductDetailView({
  categoryKey,
  categoryLabel,
  backHref,
  product,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  const [activeIndex, setActiveIndex] = useState(0);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const isSoldOut = useMemo(() => {
    return product.sizes.length > 0 && product.sizes.every((s) => !s.inStock);
  }, [product]);

  const activeImage = product.images[Math.min(activeIndex, product.images.length - 1)];

  return (
    <main className="pdMain">
      <nav className="pdCrumb" aria-label="Breadcrumb">
        <Link href={backHref}>{categoryLabel}</Link>
        <span className="pdCrumb__sep">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="pdLayout" aria-label="Product detail">
        <div className="pdGallery">
          <div className="pdStage">
            <img src={activeImage} alt={product.name} />

            {/* SOLD OUT（詳細側：静かなバッジ） */}
            {isSoldOut && (
              <div className="pdSoldBadge" aria-label="Sold out">
                <span className="pdSoldBadge__en">SOLD OUT</span>
                <span className="pdSoldBadge__ja">在庫なし</span>
              </div>
            )}
          </div>

          <div className="pdThumbs" aria-label="Image thumbnails">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`pdThumb ${i === activeIndex ? "is-active" : ""}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`画像 ${i + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <aside className="pdInfo">
          <h1 className="pdTitle">
            <span className="en">{product.name}</span>
            <span className="ja">{product.nameJa}</span>
          </h1>

          <div className="pdPrice">{product.price}</div>

          <div className="pdMeta">
            {product.color ? (
              <div className="pdMetaRow">
                <span className="label">Color</span>
                <span className="value">{product.color}</span>
              </div>
            ) : null}
            <div className="pdMetaRow">
              <span className="label">Category</span>
              <span className="value">{categoryLabel}</span>
            </div>
          </div>

          {product.description ? <p className="pdDesc">{product.description}</p> : null}

          <div className="pdActions">
            <button type="button" className="pdSizeBtn" onClick={() => setSizeOpen(true)}>
              {selectedSize ? `サイズ：${selectedSize}` : "サイズを選ぶ"}
            </button>

            <button
              type="button"
              className={`pdPrimary ${isSoldOut ? "is-soldout" : ""}`}
              disabled={isSoldOut || !selectedSize}
              onClick={() => {
                if (isSoldOut || !selectedSize) return;

                addItem({
  variant_id: "60fdcea5-9bea-451c-a2d2-1dbcfe940749", // ★追加（テスト用固定）

  id: product.id,
  slug: categoryKey, // ★ここにカテゴリを入れる（現状維持）
  name: product.name,
  nameJa: product.nameJa,

  price: Number(String(product.price).replace(/[^\d]/g, "")) || 0,
  image: product.images?.[0] ?? "",

  size: selectedSize,
  qty: 1,
});


                router.push("/bag");
              }}
            >
              {isSoldOut ? (
                <>
                  SOLD OUT
                  <span className="pdPrimaryJa">再入荷待ち</span>
                </>
              ) : selectedSize ? (
                <>
                  ADD TO BAG
                  <span className="pdPrimaryJa">カートに入れる</span>
                </>
              ) : (
                "サイズを選択してください"
              )}
            </button>

            <Link className="pdLink" href="/terms">
              配送・返品について
            </Link>
          </div>
        </aside>
      </section>

      {/* Size Drawer */}
      <div className={`pdDrawerWrap ${sizeOpen ? "is-open" : ""}`}>
        <button className="pdDrawerBackdrop" aria-label="Close" onClick={() => setSizeOpen(false)} />
        <aside className="pdDrawer" aria-label="サイズ選択">
          <div className="pdDrawerHead">
            <div>
              <div className="pdDrawerTitle">サイズ</div>
              <button type="button" className="pdGuideBtn">サイズガイド →</button>
            </div>

            <button type="button" className="pdDrawerClose" aria-label="Close" onClick={() => setSizeOpen(false)}>
              ×
            </button>
          </div>

          <div className="pdSizeList">
            {product.sizes.map((s) => {
              const disabled = !s.inStock;
              const isSelected = selectedSize === s.label;

              return (
                <button
                  key={s.label}
                  type="button"
                  className={`pdSizeRow ${disabled ? "is-disabled" : ""} ${isSelected ? "is-selected" : ""}`}
                  disabled={disabled}
                  onClick={() => {
                    setSelectedSize(s.label);
                    setSizeOpen(false);
                  }}
                >
                  <div className="pdSizeLeft">
                    <div className="pdSizeLabel">{s.label}</div>
                    {s.note ? <div className="pdSizeNote">{s.note}</div> : null}
                  </div>
                  {!s.inStock ? <div className="pdSizeState">在庫なし</div> : <div className="pdSizeState">選択</div>}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
