import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Gender = "women" | "men";
type Panel = "root" | "gender";

const ROOT_LINKS = [
  { href: "/concept", en: "ABOUT", ja: "コンセプト" },
  { href: "/contest", en: "CONTEST", ja: "コンテスト" },
] as const;

const CATEGORIES = [
  { href: "/shirt", en: "SHIRT", ja: "シャツ" }, // ★ T-SHIRTを廃止して統一
  { href: "/hoodie", en: "HOODIE", ja: "フーディー" },
  { href: "/jacket", en: "JACKET", ja: "ジャケット" },
  { href: "/bottoms", en: "BOTTOMS", ja: "ボトム" },
  { href: "/knit", en: "KNIT", ja: "ニット" },
] as const;

export default function SiteHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("root");
  const [gender, setGender] = useState<Gender>("women");

  // 初期：query.gender → localStorage → women
  useEffect(() => {
    const q = router.query?.gender;
    const qGender = q === "women" || q === "men" ? (q as Gender) : null;

    let saved: Gender | null = null;
    if (typeof window !== "undefined") {
      const s = window.localStorage.getItem("15_gender");
      saved = s === "women" || s === "men" ? (s as Gender) : null;
    }

    setGender(qGender ?? saved ?? "women");
  }, [router.query?.gender]);

  // open時スクロールロック
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setPanel("root");
  };

  const pickGender = (g: Gender) => {
    setGender(g);
    if (typeof window !== "undefined") window.localStorage.setItem("15_gender", g);
    setPanel("gender");
  };

  const goCategory = (href: string) => {
    const sep = href.includes("?") ? "&" : "?";
    router.push(`${href}${sep}gender=${gender}`);
    close();
  };

  return (
    <>
      <header className="sh">
        <div className="shInner">
          <Link className="shLogo" href="/" aria-label="15 Home">
            {/* ヘッダーロゴ（パスはあなたの構成に合わせて） */}
            <Image src="/brand/logo-header.png" alt="15" width={34} height={34} priority />
          </Link>

          <div className="shRight">
            <Link className="shIcon" href="/bag" aria-label="Bag">
              <span aria-hidden="true">👜</span>
            </Link>

            <button className="shMenuBtn" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
              <span className="shMenuText">MENU</span>
              <span className="shBurger" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer */}
      <div className={`shDrawerWrap ${open ? "isOpen" : ""}`} aria-hidden={!open}>
        <button className="shBackdrop" onClick={close} aria-label="Close menu" />

        <aside className="shDrawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="shDrawerHead">
            {panel === "gender" ? (
              <button className="shBack" type="button" onClick={() => setPanel("root")} aria-label="Back">
                ←
              </button>
            ) : (
              <span className="shHeadSpacer" />
            )}

            <div className="shDrawerTitle">MENU</div>

            <button className="shClose" type="button" onClick={close} aria-label="Close">
              ×
            </button>
          </div>

          <div className="shDrawerBody">
            {panel === "root" ? (
              <nav className="shNav" aria-label="Primary">
                <button className="shNavItem" type="button" onClick={() => pickGender("women")}>
                  <span className="shNavEn">WOMEN</span>
                  <span className="shNavJa">ウィメンズ</span>
                </button>

                <button className="shNavItem" type="button" onClick={() => pickGender("men")}>
                  <span className="shNavEn">MEN</span>
                  <span className="shNavJa">メンズ</span>
                </button>

                {ROOT_LINKS.map((l) => (
                  <Link key={l.href} className="shNavItem" href={l.href} onClick={close}>
                    <span className="shNavEn">{l.en}</span>
                    <span className="shNavJa">{l.ja}</span>
                  </Link>
                ))}
              </nav>
            ) : (
              <nav className="shNav" aria-label="Categories">
                <div className="shSectionLabel">
                  <span className="shSectionEn">{gender === "women" ? "WOMEN" : "MEN"}</span>
                  <span className="shSectionJa">{gender === "women" ? "ウィメンズ" : "メンズ"}</span>
                </div>

                {CATEGORIES.map((c) => (
                  <button key={c.href} className="shNavItem" type="button" onClick={() => goCategory(c.href)}>
                    <span className="shNavEn">{c.en}</span>
                    <span className="shNavJa">{c.ja}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="shDrawerFoot">
            <Link className="shFootLink" href="/privacy" onClick={close}>
              Privacy
            </Link>
            <span className="shDot">•</span>
            <Link className="shFootLink" href="/terms" onClick={close}>
              Terms
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
