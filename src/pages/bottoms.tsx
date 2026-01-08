// src/pages/bottoms.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductCard from "@/components/ProductCard";

type BottomType = "pants" | "shorts";
type BottomFilter = "all" | BottomType;

type Product = {
  id: string;
  name: string;
  nameJa: string;
  price: string;
  image: string;
  badge?: string;
  type: BottomType; // PANTS / SHORTS
  soldOut?: boolean; // ★将来用（今は無くてもOK）
};

const PRODUCTS: Product[] = [
  {
    id: "forest-pants",
    name: "Forest Line Pants",
    nameJa: "Forest Line",
    price: "¥6,800",
    image: "/products/bottoms-01.png",
    badge: "NEW",
    type: "pants",
    soldOut: false,
  },
  {
    id: "okinawa-black-pants",
    name: "Okinawa Black Pants",
    nameJa: "Okinawa Black",
    price: "¥6,800",
    image: "/products/bottoms-02.png",
    type: "pants",
    soldOut: false,
  },
  {
    id: "reef-shorts",
    name: "Reef Shorts",
    nameJa: "Reef",
    price: "¥5,800",
    image: "/products/bottoms-03.png",
    badge: "LIMITED",
    type: "shorts",
    soldOut: false,
  },
];

const FILTERS: { key: BottomFilter; en: string; ja: string }[] = [
  { key: "all", en: "ALL", ja: "すべて" },
  { key: "pants", en: "PANTS", ja: "パンツ" },
  { key: "shorts", en: "SHORTS", ja: "ショーツ" },
];

const isBottomFilter = (v: any): v is BottomFilter =>
  v === "all" || v === "pants" || v === "shorts";

export default function BottomsPage() {
  const router = useRouter();

  // gender（既存の挙動を維持）
  const gender = router.query.gender === "men" ? "men" : "women";

  // bottoms フィルター（URLクエリ: ?type=pants|shorts）
  const type: BottomFilter = isBottomFilter(router.query.type)
    ? (router.query.type as BottomFilter)
    : "all";

  // 商品の絞り込み
  const filtered = useMemo(() => {
    if (type === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.type === type);
  }, [type]);

  // フィルター切り替え（genderは維持、typeだけ更新）
  const setType = (next: BottomFilter) => {
    const q: Record<string, string> = { gender };

    if (next !== "all") q.type = next;

    router.push({ pathname: "/bottoms", query: q }, undefined, {
      shallow: true,
    });
  };

  // 性別切り替え（typeは維持）
  const setGender = (g: "women" | "men") => {
    const q: Record<string, string> = { gender: g };

    if (type !== "all") q.type = type;

    if (typeof window !== "undefined") {
      window.localStorage.setItem("15_gender", g);
    }

    router.push({ pathname: "/bottoms", query: q }, undefined, {
      shallow: true,
    });
  };

  return (
    <>
      <Head>
        <title>BOTTOMS | 15 — Okinawa Art Apparel</title>
        <meta
          name="description"
          content="ボトム一覧。余白と空気感を大切にした 15 のコレクション。"
        />
      </Head>

      <div className="bottomsPage">
        <SiteHeader />

        <main className="categoryMain bottomsMain">
          {/* 上部ロゴ（shirtと同じ） */}
          <section className="categoryTop">
            <img
              src="/brand/logo-header.png"
              alt="15"
              className="categoryLogo"
            />
          </section>

          {/* 性別タブ + フィルタータブ（SHIRTと同じ構造） */}
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

            {/* Type Filter */}
            <div className="tabsSection bottomsFilterSection" aria-label="Filter">
              <div className="tabs">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`tab ${type === f.key ? "is-active" : ""}`}
                    onClick={() => setType(f.key)}
                  >
                    <span className="en">{f.en}</span>
                    <span className="ja">{f.ja}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* GRID */}
          <section className="bottomsGridSection">
            <div className="bottomsGrid">
              {filtered.map((p) => (
               <ProductCard
  key={p.id}
  prefix="bottoms"
  href={`/p/bottoms/${p.id}?gender=${gender}${type !== "all" ? `&type=${type}` : ""}`}
  name={p.name}
  nameJa={p.nameJa}
  price={p.price}
  image={p.image}
  badge={p.badge}
  soldOut={p.soldOut}
  metaRight={p.type === "pants" ? "PANTS" : "SHORTS"}
/>
              ))}
            </div>

            {/* 0件になった時の保険 */}
            {filtered.length === 0 && (
              <p className="bottomsEmpty">
                <span className="en">NO ITEMS</span>
                <span className="ja">該当する商品がありません</span>
              </p>
            )}
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
