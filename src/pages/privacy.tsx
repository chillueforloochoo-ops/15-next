// src/pages/privacy.tsx
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function PrivacyPage() {
  return (
    <>
<SiteHeader />
      <main className="legal-main">
        <div className="legal-inner">
          <p className="legal-eyebrow">PRIVACY POLICY</p>
          <h1 className="legal-title">プライバシーポリシー</h1>
          <p className="legal-meta">最終更新日：2025-12-12</p>

          <section className="legal-section">
            <h2>1. 取得する情報</h2>
            <p>
              当サイトでは、お問い合わせや購入手続き等により、氏名、メールアドレス、配送先住所、
              決済に関する情報（カード番号そのものを除く）、アクセスログ等を取得する場合があります。
            </p>
          </section>

          <section className="legal-section">
            <h2>2. 利用目的</h2>
            <ul>
              <li>商品の発送、代金決済、本人確認</li>
              <li>お問い合わせ対応、重要なお知らせの連絡</li>
              <li>サービス改善、品質向上のための分析</li>
              <li>不正利用の防止、安全性の確保</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. 第三者提供</h2>
            <p>
              法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。
              ただし、配送会社・決済事業者等、業務委託先へ必要な範囲で提供することがあります。
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Cookie等の利用</h2>
            <p>
              当サイトは利便性向上やアクセス解析のため、Cookie等を利用する場合があります。
              ブラウザ設定によりCookieを無効化できますが、一部機能が利用できないことがあります。
            </p>
          </section>

          <section className="legal-section">
            <h2>5. 開示・訂正・削除</h2>
            <p>
              ご本人からの請求があった場合、法令に従い、保有個人情報の開示・訂正・削除等に対応します。
            </p>
          </section>

          <section className="legal-section">
            <h2>6. お問い合わせ窓口</h2>
            <p>
              お問い合わせは <a href="/contact">お問い合わせページ</a> よりご連絡ください。
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
