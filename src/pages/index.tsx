// src/pages/index.tsx
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const ContestMainVisual = dynamic(
  () => import("../components/ContestMainVisual"),
  { ssr: false }
);

const HomePage: React.FC = () => {
  const [slideIndex, setSlideIndex] = useState(0);

  // ===== Saioh スライド用 =====
  const saiohImages = [
    "/strength/saiho1.jpg",
    "/strength/saiho2.jpg",
    "/strength/saiho3.jpg",
    "/strength/saiho4.jpg",
  ];
useEffect(() => {
  const hero = document.querySelector(".hero-copy") as HTMLElement | null;
  if (!hero) return;

  hero.classList.remove("is-in");
  const t = window.setTimeout(() => hero.classList.add("is-in"), 180);

  return () => window.clearTimeout(t);
}, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % saiohImages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const currentSaiohImage = saiohImages[slideIndex];
// ===== スクロールで余韻ポイント発火 =====
useEffect(() => {
  const heroCopy = document.querySelector(".hero-copy");
  if (!heroCopy) return;

  const onScroll = () => {
    const y = window.scrollY;

    // ここが「余韻ポイント」
    if (y > 80) {
      heroCopy.classList.add("is-leaving");
    } else {
      heroCopy.classList.remove("is-leaving");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);

useEffect(() => {
  const cards = document.querySelectorAll(".category-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;

          // ★ ここで遅らせる（index × 120ms）
          el.style.transitionDelay = `${index * 180}ms`;

          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15 }
  );

  cards.forEach((card) => observer.observe(card));
  return () => observer.disconnect();
}, []);

useEffect(() => {
  const items = document.querySelectorAll(".hero [data-animate]");

  items.forEach((el, index) => {
    const element = el as HTMLElement;

    // ★ カテゴリーと同じ 120ms
    element.style.transitionDelay = `${index * 120}ms`;

    requestAnimationFrame(() => {
      element.classList.add("is-visible");
    });
  });
}, []);

useEffect(() => {
  const img = document.querySelector(".hotImg");
  if (!img) return;

  const el = img as HTMLElement;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          // ★ 余韻に合わせて少し遅らせる（必要なければ 0 に）
          el.style.transitionDelay = `180ms`;

          el.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.25 }
  );

  observer.observe(el);
  return () => observer.disconnect();
}, []);

useEffect(() => {
  const items = Array.from(document.querySelectorAll(".reveal-up"));
  if (!items.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;

        (e.target as HTMLElement).classList.add("is-visible");
        io.unobserve(e.target);
      });
    },
    { threshold: 0.2 }
  );

  items.forEach((el) => io.observe(el));
  return () => io.disconnect();
}, []);

  return (
    <>
      <Head>
        <title>15 | Okinawa Art Apparel</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

<SiteHeader />
<section className="hero hero--sea">
  {/* 背景 */}
  <div className="hero-bg" />
  <div className="hero-veil" />

  {/* テキスト */}
  <div className="hero-copy">
   <h1 className="hero-okn" data-animate>OKINAWA</h1>

<p className="hero-sub" data-animate>
  four hundred and twenty-porter
</p>

<ul className="hero-list">
  <li data-animate>Thoughtful Gifts</li>
  <li data-animate>Attention to materials</li>
  <li data-animate>Conscious of art, not design</li>
  <li data-animate>Thinking of you who I can't see yet</li>
  <li data-animate>It's a process of trial and error</li>
  <li data-animate>Deliver it from Okinawa</li>
</ul>

<p className="hero-made" data-animate>
  Made by Okinawa
</p>

  </div>
</section>



      {/* PICK UP CATEGORIES */}
      <section id="category">
        <h2>PICK UP CATEGORIES</h2>
        <p className="section-sub">おすすめカテゴリ</p>

        <div className="grid-4">
    {/* Tシャツだけ先にリンク化 */}
<Link href="/shirt" className="category-card">
  <div className="category-thumb" />
  <div className="category-label-en">SHIRT</div>
  <div className="category-label-ja">シャツ</div>
</Link>

 <Link href="/hoodie" className="category-card">
  <div className="category-thumb" />
  <div className="category-label-en">HOODIE</div>
  <div className="category-label-ja">パーカー</div>
</Link>

<Link href="/jacket" className="category-card">
  <div className="category-thumb" />
  <div className="category-label-en">JACKET</div>
  <div className="category-label-ja">ジャケット</div>
</Link>

<Link href="/bottoms" className="category-card">
  <div className="category-thumb" />
  <div className="category-label-en">BOTTOMS</div>
  <div className="category-label-ja">ボトム</div>
</Link>


        </div>
      </section>

{/* HOT ITEM VIEW */}
      <section
  id="hot"
  className="hotSection"
>
        <div className="hotHead">
          <h2 className="hotTitle">HOT ITEM VIEW</h2>
          <p className="hotSub">ホットアイテム</p>
        </div>

        <div className="hotWrapper">
     <div className="hotWrapper">
  <Link href="/hoodie/hoodie-float" className="hotStage">
    <img
      className="hotImg hotImg--scroll"
      src="/hotview/hoodie-float.png"
      alt="Floating Hoodie"
      loading="lazy"
    />
  </Link>
          </div>

          <div className="hotLabel">HOT ITEM — HOODIE / SAMPLE</div>
          <p className="hotNote">※仮画像。後日撮影した実物写真に差し替え予定。</p>
        </div>
      </section>

        {/* WHY 15 WORKS */}
      <section id="strengths">
        <h2>WHY 15 WORKS</h2>
        <p className="section-sub">ブランドの強み</p>
        <div className="strengthsSwipe">
        <div className="strengths-list">
          {/* ① Inkjet Studio */}
          <article className="strength-card">
            <div className="strength-image">
              <img
                src="/strength/gtx-card.png"
                alt="Brother GTXインクジェットプリンター"
                className="strength-image-img"
              />
            </div>
            <h3 className="strength-title">
              Inkjet Studio（インクジェットスタジオ）
            </h3>
            <p className="strength-text">
              Brother GTXインクジェットプリンターを自社で運用。素材に合わせたインク調整で、
              写真やグラデーションもディテールまで忠実にプリントします。
            </p>
          </article>

          {/* ② Saioh スライドカード */}
          <article className="strength-card">
            <div className="strength-image">
              <img
                src={currentSaiohImage}
                alt="Art Direction by Saioh の作品イメージ"
                className="strength-image-img"
              />
            </div>

            <div className="strength-header">
              <h3 className="strength-title">
                Art Direction by Saioh（アートディレクション）
              </h3>
<a
  href="https://www.instagram.com/saioh_photography/"
  target="_blank"
  rel="noopener noreferrer"
  className="insta-icon"
  aria-label="Saioh Instagram"
>
  <img src="/icons/instagram-icon.png" alt="Instagram" className="insta-img" />
</a>

            </div>

            <p className="strength-text">
              元Red Bull専属カメラマン・Saiohがデザインを監修。個展で培った感性を、
              そのまま一枚の服に落とし込みます。
            </p>
          </article>

          {/* ③ High Quality & Fair Price */}
    <article className="strength-card">
  <div className="strength-image video-container">
    <video 
      src="/strength/process.mp4"
      className="strength-video"
      autoPlay
      loop
      muted
      playsInline
    ></video>
  </div>

  <h3 className="strength-title">
    Production Process（制作工程）
  </h3>

  <p className="strength-text">
   デザインから制作まで自社完結のフローを構築。ハイクオリティとロープライスを両立し、
              沖縄発ブランドとして国内外へ価値を届けます。
  </p>
</article>
</div>
</div>
</section>

<section id="contest">
  <h2>15 DESIGN CONTEST</h2>
  <p className="section-sub">デザインコンテスト</p>

  <div className="contest-grid">
    {/* 左：モック画像エリア */}
   <div className="contest-mock">
  <div className="contest-mock-frame">
    <ContestMainVisual intervalMs={1500} />
  </div>
</div>  



    {/* 右：応募概要＋テーマ＋CTA */}
    <div className="contest-panel">
    <div className="contestText">
  <h3 className="reveal-up" style={{ ["--d" as any]: "0ms" }}>
    あなたのデザインが、15の次の一枚に。
  </h3>

  <div className="reveal-up" style={{ ["--d" as any]: "180ms" }}>
    <div className="contestLabel">CURRENT THEME</div>
    <div className="contestTheme">「沖縄 × アートアパレルの新しい景色」</div>
  </div>

  <p className="reveal-up" style={{ ["--d" as any]: "360ms" }}>
    提示されたテーマに合わせて、Tシャツやパーカーのデザインを募集します。…
  </p>

  <p className="reveal-up" style={{ ["--d" as any]: "540ms" }}>
    採用デザインには、売上の一部還元・サンプル提供・商品ページでのクレジット表記など…
  </p>

<div className="reveal-up" style={{ ["--d" as any]: "720ms" }}>
  <Link href="/contest/apply" className="contestCta">
    APPLY DESIGN
  </Link>
</div>

</div>
    </div>
  </div>
</section>  



   <>
  {/* ページの中身 */}
  <SiteFooter />
</>
 </>
  );
};

export default HomePage;
