// src/pages/hoodie.tsx
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
    id: "island-core",
    name: "Island Core Hoodie",
    nameJa: "Island Core",
    price: "¥6,800",
    image: "/products/hoodie-01.png",
    badge: "NEW",
  },
  {
    id: "night-wave",
    name: "Night Wave Hoodie",
    nameJa: "Night Wave",
    price: "¥6,800",
    image: "/products/hoodie-02.png",
  },
  {
    id: "reef-archive",
    name: "Reef Archive Hoodie",
    nameJa: "Reef Archive",
    price: "¥6,800",
    image: "/products/hoodie-03.png",
    badge: "LIMITED",
  },
];

export default function HoodiePage() {
  const router = useRouter();
  const gender = router.query.gender === "men" ? "men" : "women";

  const setGender = (g: "women" | "men") => {
    const q: Record<string, string> = { gender: g };

    if (typeof window !== "undefined") {
      window.localStorage.setItem("15_gender", g);
    }

    router.push({ pathname: "/hoodie", query: q }, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>HOODIE | 15 — Okinawa Art Apparel</title>
        <meta
          name="description"
          content="パーカー一覧。余白と空気感を大切にした 15 のアパレルコレクション。"
        />
      </Head>

      <div className="hoodiePage">
        <SiteHeader />

        <main className="categoryMain hoodieMain">
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
          <section className="hoodieGridSection">
            <div className="hoodieGrid">
              {PRODUCTS.map((p) => (
                <ProductCard
                  key={p.id}
                  prefix="hoodie"
                  href={`/p/hoodie/${p.id}?gender=${gender}`}
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
