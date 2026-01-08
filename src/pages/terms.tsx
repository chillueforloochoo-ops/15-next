// src/pages/terms.tsx
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function TermsPage() {
  return (
    <>
<SiteHeader />

      <main className="legal-main">
        <div className="legal-inner">
          <p className="legal-eyebrow">TERMS</p>
          <h1 className="legal-title">利用規約</h1>
          <p className="legal-meta">最終更新日：2025-12-12</p>

          <section className="legal-section">
            <h2>1. 適用</h2>
            <p>
              本規約は、15（以下「当ブランド」）が提供するサービスの利用条件を定めるものです。
            </p>
          </section>

          <section className="legal-section">
            <h2>2. 禁止事項</h2>
            <ul>
              <li>法令または公序良俗に違反する行為</li>
              <li>不正アクセス、システムへの過度な負荷</li>
              <li>当ブランドまたは第三者の権利侵害</li>
              <li>虚偽の情報提供</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. 免責</h2>
            <p>
              当ブランドは、サービスの停止・変更・中断等により生じた損害について、法令で許容される範囲で責任を負いません。
            </p>
          </section>

          <section className="legal-section">
            <h2>4. 著作権等</h2>
            <p>
              当サイトに掲載される文章・画像・デザイン等の権利は当ブランドまたは正当な権利者に帰属します。
              無断転載は禁止転載を禁止します。
            </p>
          </section>

          <section className="legal-section">
            <h2>5. 準拠法・管轄</h2>
            <p>
              本規約は日本法を準拠法とし、紛争が生じた場合は当ブランド所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

          <div className="legal-back">
            <Link href="/">← トップへ戻る</Link>
          </div>
        </div>
      </main>
    </>
  );
}
