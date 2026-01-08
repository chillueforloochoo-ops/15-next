// src/pages/shirt.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductCard from "@/components/ProductCard";

type Sleeve = "short" | "long";
type SleeveFilter = "all" | Sleeve;

type Product = {
  id: string;
  name: string;
  nameJa: string;
  price: string;
  image: string;
  badge?: string;
  sleeve: Sleeve; // ★追加：半袖/長袖
  soldOut?: boolean; // ★追加：売り切れフラグ
};

const PRODUCTS: Product[] = [
  {
    id: "monster-cookie",
    name: "Monster Cookie Shirt",
    nameJa: "Monster Cookie",
    price: "¥3,800",
    image: "/products/tshirt-01.png",
    badge: "NEW",
    sleeve: "short",
    soldOut: true, // ★
  },
  {
    id: "okinawa-night",
    name: "Okinawa Night Shirt",
    nameJa: "Okinawa Night",
    price: "¥3,800",
    image: "/products/tshirt-02.png",
    sleeve: "long",
    soldOut: false,
  },
  {
    id: "reef-line",
    name: "Reef Line Shirt",
    nameJa: "Reef Line",
    price: "¥3,800",
    image: "/products/tshirt-03.png",
    badge: "LIMITED",
    sleeve: "short",
    soldOut: false,
  },
];

const FILTERS: { key: SleeveFilter; en: string; ja: string }[] = [
  { key: "all", en: "ALL", ja: "すべて" },
  { key: "short", en: "SHORT SLEEVE", ja: "半袖" },
  { key: "long", en: "LONG SLEEVE", ja: "長袖" },
];

const isSleeveFilter = (v: any): v is SleeveFilter =>
  v === "all" || v === "short" || v === "long";

export default function ShirtPage() {
  const router = useRouter();

  // gender（既存の挙動を維持）
  const gender = router.query.gender === "men" ? "men" : "women";

  // sleeve フィルター（URLクエリ: ?sleeve=short|long）
  const sleeve: SleeveFilter = isSleeveFilter(router.query.sleeve)
    ? (router.query.sleeve as SleeveFilter)
    : "all";
  // 性別切り替え（sleeveは維持）
  const setGender = (g: "women" | "men") => {
    const q: Record<string, string> = { gender: g };

    if (sleeve !== "all") q.sleeve = sleeve;

    // SiteHeaderと整合：localStorageも更新
    if (typeof window !== "undefined") {
      window.localStorage.setItem("15_gender", g);
    }

    router.push({ pathname: "/shirt", query: q }, undefined, { shallow: true });
  };

  // HERO背景（genderで切替）
  const heroBg =
    gender === "men"
      ? "url('/hero/shirt-hero-men.webp')"
      : "url('/hero/shirt-hero-women.webp')";

  // 商品の絞り込み
  const filtered = useMemo(() => {
    if (sleeve === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.sleeve === sleeve);
  }, [sleeve]);

  // フィルター切り替え（genderは維持、sleeveだけ更新）
  const setSleeve = (next: SleeveFilter) => {
    const q: Record<string, string> = {};

    // genderは常に維持（今のUXに合わせる）
    q.gender = gender;

    if (next !== "all") q.sleeve = next;

    router.push(
      { pathname: "/shirt", query: q },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      <Head>
        <title>SHIRT | 15 — Okinawa Art Apparel</title>
        <meta
          name="description"
          content="シャツ一覧。余白と空気感を大切にした 15 のコレクション。"
        />
      </Head>

      <div className="shirtPage">
        <SiteHeader />

   <main className="categoryMain shirtMain">
        <section className="categoryTop">
           <img
      src="/brand/logo-header.png"  // ← 実際のロゴパスに合わせて
      alt="15"
      className="categoryLogo"
    />
        </section>
{/* 性別＋袖タブ 横並び */}
<section className="tabsRow">
  {/* Gender */}
  <div className="tabsSection" aria-label="Gender">
    <div className="tabs">
      <button
        type="button"
        className={`tab ${gender === "women" ? "is-active" : ""}`}
        onClick={() => setGender("women")}
      >
        <span className="en">WOMEN</span>
        <span className="ja">ウィメンズ</span>
      </button>

      <button
        type="button"
        className={`tab ${gender === "men" ? "is-active" : ""}`}
        onClick={() => setGender("men")}
      >
        <span className="en">MEN</span>
        <span className="ja">メンズ</span>
      </button>
    </div>
  </div>

  {/* Sleeve Filter */}
  <div className="tabsSection shirtFilterSection" aria-label="Filter">
    <div className="tabs">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`tab ${sleeve === f.key ? "is-active" : ""}`}
          onClick={() => setSleeve(f.key)}
        >
          <span className="en">{f.en}</span>
          <span className="ja">{f.ja}</span>
        </button>
      ))}
    </div>
  </div>
</section>
<section className="shirtGridSection">
  <div className="shirtGrid">
    {filtered.map((p) => (
      <ProductCard
        key={p.id}
        prefix="shirt"
        href={`/shirt/${p.id}?gender=${gender}${sleeve !== "all" ? `&sleeve=${sleeve}` : ""}`}
        name={p.name}
        nameJa={p.nameJa}
        price={p.price}
        image={p.image}
        badge={p.badge}
        soldOut={p.soldOut}
        metaRight={p.sleeve === "long" ? "LONG" : "SHORT"}
      />
    ))}
  </div>
</section>


        </main>

        <SiteFooter />
      </div>
    </>
  );
}
