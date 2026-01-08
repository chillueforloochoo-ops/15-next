// src/pages/knit.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: string;
  name: string;
  nameJa: string;
  price: string;
  image: string;
  badge?: string;
};

const PRODUCTS: Product[] = [
  {
    id: "calm-weave",
    name: "Calm Weave Knit",
    nameJa: "Calm Weave",
    price: "¥8,800",
    image: "/products/knit-01.png",
    badge: "NEW",
  },
  {
    id: "night-fiber",
    name: "Night Fiber Knit",
    nameJa: "Night Fiber",
    price: "¥8,800",
    image: "/products/knit-02.png",
  },
  {
    id: "reef-soft",
    name: "Reef Soft Knit",
    nameJa: "Reef Soft",
    price: "¥8,800",
    image: "/products/knit-03.png",
    badge: "LIMITED",
  },
];

export default function KnitPage() {
  const router = useRouter();
  const gender = router.query.gender === "men" ? "men" : "women";

  const setGender = (g: "women" | "men") => {
    const q: Record<string, string> = { gender: g };

    if (typeof window !== "undefined") {
      window.localStorage.setItem("15_gender", g);
    }

    router.push({ pathname: "/knit", query: q }, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>KNIT | 15 — Okinawa Art Apparel</title>
        <meta
          name="description"
          content="ニット一覧。余白と空気感を大切にした 15 のアパレルコレクション。"
        />
      </Head>

      <div className="knitPage">
        <SiteHeader />

        <main className="categoryMain knitMain">
          {/* ロゴ */}
          <section className="categoryTop">
            <img
              src="/brand/logo-header.png"
              alt="15"
              className="categoryLogo"
            />
          </section>

          {/* Gender Tabs */}
          <section className="tabsRow">
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
          </section>

          {/* GRID */}
          <section className="knitGridSection">
            <div className="knitGrid">
              {PRODUCTS.map((p) => (
                <ProductCard
                  key={p.id}
                  prefix="knit"
                  href={`/p/knit/${p.id}?gender=${gender}`}
                  name={p.name}
                  nameJa={p.nameJa}
                  price={p.price}
                  image={p.image}
                  badge={p.badge}
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
