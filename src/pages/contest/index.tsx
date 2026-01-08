// src/pages/contest/index.tsx
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function ContestComingSoonPage() {
  return (
    <>
      <Head>
        <title>CONTEST | 15</title>
        <meta name="description" content="Design Contest — Coming Soon" />
      </Head>

      <SiteHeader />

      <main className="ccs">
        {/* 背景（画像は public に置いたパスへ） */}
        <div className="ccs__bg" aria-hidden="true" />
        <div className="ccs__veil" aria-hidden="true" />

        <div className="ccs__inner">
          <p className="ccs__kicker">DESIGN CONTEST</p>
          <h1 className="ccs__title">Coming Soon</h1>

          <p className="ccs__lead">
            現在、最高の体験に仕上げるため準備中です。<br />
            公開まで、もう少しだけお待ちください。
          </p>

          <div className="ccs__actions">
            <Link href="/concept#contest" className="ccs__btn">
              VIEW CONCEPT →
            </Link>
            <Link href="/" className="ccs__link">
              BACK TO HOME →
            </Link>
          </div>

          <p className="ccs__note">© 15 — Okinawa Art Apparel</p>
        </div>
      </main>
    </>
  );
}
