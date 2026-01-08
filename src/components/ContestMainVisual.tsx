import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

type Props = {
  intervalMs?: number; // デフォ: 500ms
};

export default function ContestMainVisual({ intervalMs = 500 }: Props) {
  const designs = useMemo(
    () => [
      "/contest/design1.png",
      "/contest/design2.png",
      "/contest/design3.png",
      "/contest/design4.png",
      "/contest/design5.png",
    ],
    []
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((p) => (p + 1) % designs.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [designs.length, intervalMs]);

  return (
    <div className="contest-mainvisual">
      {/* 土台（Tシャツ） */}
  <Image
  src="/contest/base.png"
  alt="15 design contest tshirt"
  fill
  priority
  className="contest-mainvisual__base"
/>


      {/* プリント領域（ここにデザインが切り替わって入る） */}
      <div className="contest-mainvisual__printArea" aria-hidden="true">
        {designs.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            className={
              "contest-mainvisual__design" + (i === index ? " is-active" : "")
            }
            sizes="(max-width: 768px) 70vw, 420px"
          />
        ))}
      </div>
    </div>
  );
}
