// src/components/ProductCard.tsx
import Link from "next/link";
import ProductDetailView from "@/components/ProductDetail";

type Props = {
  /** "shirt" | "bottoms" | "jacket" | "hoodie" | "knit" など（既存CSSの接頭辞） */
  prefix: string;

  /** Link href（クエリ込みOK） */
  href: string;

  name: string;
  nameJa: string;
  price: string;
  image: string;

  /** NEW / LIMITED など */
  badge?: string;

  /** SOLD OUT 表現（true のとき overlay 表示、badgeは非表示） */
  soldOut?: boolean;

  /** 右側に任意表示（例：SHORT/LONG, PANTS/SHORTS） */
  metaRight?: string;
};

export default function ProductCard({
  prefix,
  href,
  name,
  nameJa,
  price,
  image,
  badge,
  soldOut,
  metaRight,
}: Props) {
  const Item = `${prefix}Item`;
  const ImgWrap = `${prefix}Item__image`;
  const Badge = `${prefix}Item__badge`;
  const Info = `${prefix}Item__info`;
  const Row = `${prefix}Item__row`;

  return (
    <Link
      href={href}
      className={`${Item} ${soldOut ? "is-soldout" : ""}`}
      aria-label={soldOut ? `${name} sold out` : name}
    >
      <div className={ImgWrap}>
        <img src={image} alt={name} />

        {/* SOLD OUT overlay（共通クラス） */}
        {soldOut && (
          <div className="soldOverlay" aria-hidden="true">
            <span className="soldPill">SOLD OUT</span>
            <span className="soldPillJa">在庫なし</span>
          </div>
        )}

        {/* NEW/LIMITED は SOLD OUT の時は出さない */}
        {badge && !soldOut ? <span className={Badge}>{badge}</span> : null}
      </div>

      <div className={Info}>
        <span className="en">{name}</span>
        <span className="ja">{nameJa}</span>

        <div className={Row}>
          <span className="price">{price}</span>
          {metaRight ? <span className="meta">{metaRight}</span> : null}
        </div>
      </div>
    </Link>
  );
}