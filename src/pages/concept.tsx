// src/pages/concept.tsx
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { useEffect } from "react";

export default function ConceptPage() {
  useEffect(() => {
  const root = document.documentElement;

  const max = 0.32;   // 上部：濃い
  const min = 0.16;   // 下：薄い
  const range = 520;  // 520pxで変化しきる

  const onScroll = () => {
    const y = window.scrollY || 0;
    const t = Math.min(1, Math.max(0, y / range));
    const v = max + (min - max) * t;
    root.style.setProperty("--hero-veil", v.toFixed(3));
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
// ② reveal（テキスト遅れ）
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".js-reveal"));
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -12% 0px" }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <>
      <Head>
        <title>CONCEPT | 15 — Okinawa Art Apparel</title>
        <meta
          name="description"
          content="15のブランドコンセプト。沖縄から、世界基準のアートアパレルを。"
        />
      </Head>

      <SiteHeader />

      {/* HERO */}
      <section className="concept-hero">
        <div className="concept-hero__bg" aria-hidden="true" />
        <div className="concept-hero__inner">
          <p className="concept-eyebrow">BRAND CONCEPT</p>

          <h1 className="concept-hero__title">
          <span className="concept-hero__mark" aria-label="15">
  <img src="/brand/15-mark.png" alt="15" className="concept-hero__markImg" />
</span>

            <span className="concept-hero__sub">Okinawa Art Apparel</span>
          </h1>

          <p className="concept-hero__leadEn">Wear the art. Share the culture.</p>
          <p className="concept-hero__leadJa">沖縄から、世界基準のアートアパレルを。</p>

          <div className="concept-hero__cta">
            <Link href="/#contest" className="concept-btn">
              APPLY DESIGN
            </Link>
            <Link href="/#category" className="concept-btn concept-btn--ghost">
              VIEW ITEMS
            </Link>
          </div>
        </div>
      </section>

<section className="concept-section concept-origin" id="origin">
  <figure className="concept-origin__media">
    <img src="/concept/origin.jpg" alt="Saioh" />
    <div className="concept-origin__veil" aria-hidden="true" />

    <div className="concept-origin__inner js-reveal">
      <p className="concept-kicker">Saioh</p>
      <h2 className="concept-h2">はじまり</h2>
      <p className="concept-quote">「沖縄を、もっとおしゃれに。」</p>

      <p>
        写真家として。画家として。ブライダルという人生の節目に寄り添う事業として。
        数多くの表現とビジネスを成功させてきたオーナーが、最後に辿り着いたのが
        <strong> “服”というキャンバス</strong>だった。
      </p>
      <p>
        写真、デザイン、アート。そのすべてを日常に持ち出せる、もっとも身近なメディア。
        それがアパレルだった。
      </p>
    </div>
  </figure>
</section>


      {/* PHILOSOPHY */}
     <section className="concept-section concept-section--soft" id="philosophy">
  <div className="concept-narrow">
    <div className="js-reveal">
      <p className="concept-kicker">PHILOSOPHY</p>
      <h2 className="concept-h2">思想</h2>

      <div className="concept-statement">
        <p className="concept-statement__en">Art is not a privilege.</p>
        <p className="concept-statement__ja">アートは、選ばれた人のものじゃない。</p>
      </div>

      <p>
        若い世代や学生にとって、「おしゃれ」は時に遠く、贅沢なものになってしまう。
        15はそこに疑問を投げかける。
      </p>
      <p className="concept-dim">
        なぜ、感性を楽しむことに年齢や収入の壁があるのか。なぜ、アートは“高いもの”でなければならないのか。
      </p>
    </div>
  </div>
</section>


     {/* SYSTEM (REWORKED) */}
<section className="concept-section concept-section--system" id="system">
  <div className="concept-narrow">
    <p className="concept-kicker">SYSTEM</p>
    <h2 className="concept-h2">仕組み</h2>

    <div className="concept-systemBg" aria-hidden="true">
      <span>DESIGN</span>
      <span>PRINT</span>
      <span>DELIVER</span>
    </div>

    <div className="js-reveal">
      <p className="concept-systemEn">
        We make it ourselves.<br />
        From idea to delivery.
      </p>

      <p className="concept-systemEnSub">All in-house. Always intentional.</p>

      <p className="concept-systemJa">
        デザインから制作、販売まで。すべてを自社で完結させる。<br />
        それはコスト削減のためではない。<br />
        <strong>ファッションを、開くための設計</strong>だ。
      </p>

      <div className="concept-systemRule" aria-hidden="true" />

      <p className="concept-systemNote">
        余計な中間コストを削り、品質のブレをなくす。<br />
        そのぶん、クリエイションの熱量を一枚に残す。
      </p>
    </div>
  </div>
</section>



{/* CREATION (GALLERY REWORKED) */}
<section className="concept-section concept-section--gallery" id="creation">
  <div className="concept-narrow">
    <p className="concept-kicker">CREATION</p>
    <h2 className="concept-h2">創造</h2>

    <div className="concept-galleryHead">
      <p className="concept-bigEn">Clothing as a canvas.</p>

      <div className="concept-credit">
        <div className="concept-credit__label">Art Direction / Photography</div>
        <div className="concept-credit__name">Saioh</div>
      </div>
    </div>

    {/* メイン展示 */}
    <figure className="concept-heroFrame">
      <img
        src="/creation/saioh_01.jpeg"
        alt="Saioh artwork 01"
        className="concept-heroFrame__img"
        loading="lazy"
      />
      <figcaption className="concept-caption">
        Exhibit 01 by Saioh
      </figcaption>
    </figure>

    {/* 2点目以降（静かなギャラリー） */}
    <div className="concept-gridGallery concept-rail">
      <figure className="concept-frame">
        <img
          src="/creation/saioh_02.jpg"
          alt="Saioh artwork 02"
          className="concept-frame__img"
          loading="lazy"
        />
        <figcaption className="concept-caption">Exhibit 02</figcaption>
      </figure>

      <figure className="concept-frame">
        <img
          src="/creation/saioh_03.jpg"
          alt="Saioh artwork 03"
          className="concept-frame__img"
          loading="lazy"
        />
        <figcaption className="concept-caption">Exhibit 03</figcaption>
      </figure>
    </div>
        <figure className="concept-frame">
    <img
      src="/creation/saioh_04.jpg"
      alt="Saioh artwork 04"
      className="concept-frame__img"
      loading="lazy"
    />
    <figcaption className="concept-caption">Exhibit 04</figcaption>
  </figure>
    {/* テキストは短く、展示の余白に置く */}
    <p className="concept-galleryText">
      写真家の視点。画家の色彩感覚。アートディレクションの緊張感。<br />
      それらが一枚の布の上で重なり合い、<strong>着るアート</strong>として完成する。
    </p>

    <div className="concept-actions">
      <a
        href="https://www.instagram.com/saioh_photography/"
        target="_blank"
        rel="noopener noreferrer"
        className="concept-link"
      >
        VIEW Saioh →
      </a>
    </div>
  </div>
</section>

{/* DESIGN CONTEST */}
<section className="concept-contest" id="contest">
  {/* 背景 */}
  <div className="concept-contest__bg" aria-hidden="true" />

  {/* テキスト */}
  <div className="concept-contest__inner js-reveal">
    <p className="concept-contest__kicker">DESIGN CONTEST</p>

    <h2 className="concept-contest__title">
      未完成なブランドへ。
    </h2>

    <p className="concept-contest__en">
      Create what has never existed.
    </p>

    <p className="concept-contest__text">
      あなたの感性が、次の15になる。<br />
      プロも、学生も、名もなきクリエイターも。<br />
      一枚の布が、世界へ届くアートになる。
    </p>

    <div className="concept-contest__actions">
      <Link href="/contest/apply" className="concept-btn">
        APPLY DESIGN
      </Link>
      <Link href="/contest" className="concept-link concept-link--light">
        VIEW DETAILS →
      </Link>
    </div>
  </div>
</section>




      {/* OKINAWA TO THE WORLD */}
      <section className="concept-outro" id="future">
        <div className="concept-outro__inner">
          <p className="concept-kicker concept-kicker--light">FUTURE</p>
          <h2 className="concept-h2 concept-h2--light">沖縄から世界へ</h2>

          <p className="concept-outro__en">From Okinawa to the world.</p>
          <p className="concept-outro__ja">
            沖縄といえば海。それを超える、新しい文化のアイコンを。
          </p>

          <Link href="/" className="concept-link concept-link--light">
            BACK TO HOME →
          </Link>
        </div>
      </section>
    </>
  );
}
