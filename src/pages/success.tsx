// src/pages/success.tsx
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function SuccessPage() {
  return (
    <>
      <Head>
        <title>THANK YOU | 15</title>
      </Head>
      <SiteHeader />
      <main style={{ padding: "120px 20px", textAlign: "center" }}>
        <h1 style={{ letterSpacing: ".2em" }}>THANK YOU</h1>
        <p style={{ marginTop: 16, lineHeight: 1.8 }}>
          ご購入ありがとうございます。<br />
          確認メールをご登録アドレスへ送信しました。
        </p>
        <Link href="/" style={{ display: "inline-block", marginTop: 28 }}>
          Back to Home
        </Link>
      </main>
    </>
  );
}
