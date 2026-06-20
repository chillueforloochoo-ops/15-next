// src/components/SiteFooter.tsx
import Link from "next/link";
import Image from "next/image";
export default function SiteFooter() {
  return (
    <footer className="site-footer">
  <div className="footer-inner">
    <div className="footer-top">
      <Link href="/" className="footer-logo" aria-label="15 Home">
        <Image
          src="/brand/logo-footer.png" // ← 置いたパスに合わせて
          alt="15"
          width={88}
          height={88}
        />
      </Link>
    </div>

 
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-title">CLIENT SERVICE</div>
            <Link className="footer-link" href="/contact">お問い合わせ</Link>
            <Link className="footer-link" href="/shipping">配送について</Link>
            <Link className="footer-link" href="/faq">よくあるご質問</Link>
            <Link className="footer-link" href="/terms">利用規約</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">ABOUT</div>
            <Link className="footer-link" href="/concept">15について</Link>
            <Link className="footer-link" href="/contest">デザインコンテスト</Link>
            <Link className="footer-link" href="/privacy">プライバシー</Link>
          </div>

          <div className="footer-col">
            <div className="footer-title">SHOP / NEWSLETTER</div>

            <form
              className="footer-newsletter"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="footer-label">
                最新情報をメールで受け取る
              </label>
              <div className="footer-inputRow">
                <input
                  className="footer-input"
                  type="email"
                  placeholder="メールアドレス"
                  autoComplete="email"
                />
                <button className="footer-submit" type="submit">›</button>
              </div>
              <p className="footer-note">
                送信により、ニュースレター受信に同意したものとみなされます。
              </p>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} 15 — Okinawa Art Apparel.
          </small>
          <div className="footer-bottomLinks">
            <Link className="footer-miniLink" href="/privacy">Privacy</Link>
            <Link className="footer-miniLink" href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
