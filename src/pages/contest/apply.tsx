// pages/contest/apply.tsx
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

/* =====================
   Types
===================== */
type Side = "front" | "back"; // ← 袖なし
type Garment = "tshirt" | "hoodie" | "jacket" | "knit";

type ColorKey =
  | "white"
  | "black"
  | "red"
  | "yellow"
  | "blue"
  | "green"
  | "purple"
  | "beige"
  | "bordeaux"
  | "pink";

type Design = {
  id: string;
  url: string;
  name: string;
};

type Layer = {
  id: string;
  designId: string;
  side: Side;
  cx: number;
  cy: number;
  w: number;
  h: number;
};

type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/* =====================
   Utils
===================== */
function loadImageSize(src: string) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = reject;
    img.src = src;
  });
}
function getPrintArea(rect: DOMRect, garment: Garment, side: Side) {
  // ざっくり：中央〜やや上をプリント面として扱う
  // w/h は「Tシャツの身頃」想定で少し縦長
  const stageW = rect.width;
  const stageH = rect.height;

  // garment/sideで微調整したければここで分岐
  const w = stageW * 0.44;
  const h = stageH * 0.50;

  const x = stageW * 0.50 - w / 2;
  const y = stageH * 0.36 - h / 2; // 少し上

  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function fitToArea(imgW: number, imgH: number, areaW: number, areaH: number, padding = 0.8) {
  const sx = (areaW * padding) / imgW;
  const sy = (areaH * padding) / imgH;
  return Math.min(sx, sy, 1); // 初期で拡大しない
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const COLORS: Array<{ key: ColorKey; label: string; chip: string }> = [
  { key: "white", label: "ホワイト", chip: "#ffffff" },
  { key: "black", label: "ブラック", chip: "#111111" },
  { key: "red", label: "レッド", chip: "#d22" },
  { key: "yellow", label: "イエロー", chip: "#ffd400" },
  { key: "blue", label: "ブルー", chip: "#2a6cff" },
  { key: "green", label: "グリーン", chip: "#25b05a" },
  { key: "purple", label: "パープル", chip: "#7b4cff" },
  { key: "beige", label: "ベージュ", chip: "#d7c5a6" },
  { key: "bordeaux", label: "えんじ", chip: "#7a1f2b" },
  { key: "pink", label: "ピンク", chip: "#ff5fa7" },
];

// base image
function baseSrc(garment: Garment, color: ColorKey, side: Side) {
  return `/contest/garments/${garment}/${color}-${side}.png`;
}
function fallbackBaseSrc(garment: Garment, side: Side) {
  return `/contest/garments/${garment}/white-${side}.png`;
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function getEditorPoint(ev: PointerEvent | React.PointerEvent, rect: DOMRect) {
  return {
    x: ("clientX" in ev ? ev.clientX : 0) - rect.left,
    y: ("clientY" in ev ? ev.clientY : 0) - rect.top,
  };
}

function aspectResize(
  w: number,
  h: number,
  nextW: number,
  nextH: number,
  keepAspect: boolean
) {
  if (!keepAspect) return { w: nextW, h: nextH };
  const aspect = w / h || 1;
  if (Math.abs(nextW - w) >= Math.abs(nextH - h))
    return { w: nextW, h: nextW / aspect };
  return { w: nextH * aspect, h: nextH };
}

/* =====================
   Page
===================== */
export default function Apply() {
  const [garment, setGarment] = useState<Garment>("tshirt");
  const [side, setSide] = useState<Side>("front");
  const [color, setColor] = useState<ColorKey>("white");

  const [designs, setDesigns] = useState<Design[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);

  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    layerId: string;
    handle: Handle;
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;
    startW: number;
    startH: number;
    pointerId: number;
  } | null>(null);

  const layersForSide = useMemo(
    () => layers.filter((l) => l.side === side),
    [layers, side]
  );

  const getDesignUrl = (id: string) =>
    designs.find((d) => d.id === id)?.url ?? null;

  /* ===== upload ===== */
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = uid();
    const url = URL.createObjectURL(file);
    setDesigns((p) => [...p, { id, url, name: file.name }]);
    setActiveDesignId(id);
    e.target.value = "";
  };

  /* ===== add layer ===== */
const addLayerToCenter = async () => {
  if (!activeDesignId || !editorRef.current) return;

  const rect = editorRef.current.getBoundingClientRect();
  const url = getDesignUrl(activeDesignId);
  if (!url) return;

  try {
    const { w: imgW, h: imgH } = await loadImageSize(url);
    const area = getPrintArea(rect, garment, side);
    const scale = fitToArea(imgW, imgH, area.w, area.h, 0.78); // 0.78〜0.85好みで

    const layer: Layer = {
      id: uid(),
      designId: activeDesignId,
      side,
      cx: area.cx,
      cy: area.cy,
      w: Math.max(28, imgW * scale),
      h: Math.max(28, imgH * scale),
    };

    setLayers((p) => [...p, layer]);
    setSelectedLayerId(layer.id);
  } catch {
    // 画像サイズ取得に失敗したときは、保険で今までのサイズ
    const baseW = Math.max(140, Math.min(260, rect.width * 0.28));
    const layer: Layer = {
      id: uid(),
      designId: activeDesignId,
      side,
      cx: rect.width / 2,
      cy: rect.height * 0.35,
      w: baseW,
      h: baseW,
    };
    setLayers((p) => [...p, layer]);
    setSelectedLayerId(layer.id);
  }
};

  /* ===== pointer ===== */
  const onEditorPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setSelectedLayerId(null);
  };

  const beginTransform =
    (layerId: string, handle: Handle) =>
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !editorRef.current) return;

      const rect = editorRef.current.getBoundingClientRect();
      const pt = getEditorPoint(e, rect);
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      setSelectedLayerId(layerId);
      dragRef.current = {
        layerId,
        handle,
        startX: pt.x,
        startY: pt.y,
        startCx: layer.cx,
        startCy: layer.cy,
        startW: layer.w,
        startH: layer.h,
        pointerId: e.pointerId,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editorRef.current || !dragRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const s = dragRef.current;
    const pt = getEditorPoint(e, rect);
    const dx = pt.x - s.startX;
    const dy = pt.y - s.startY;

    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== s.layerId) return l;

        if (s.handle === "move") {
          return {
            ...l,
            cx: clamp(s.startCx + dx, 0, rect.width),
            cy: clamp(s.startCy + dy, 0, rect.height),
          };
        }

        const xSign =
          s.handle === "e" || s.handle === "ne" || s.handle === "se"
            ? 1
            : s.handle === "w" || s.handle === "nw" || s.handle === "sw"
            ? -1
            : 0;
        const ySign =
          s.handle === "s" || s.handle === "se" || s.handle === "sw"
            ? 1
            : s.handle === "n" || s.handle === "ne" || s.handle === "nw"
            ? -1
            : 0;

        const sized = aspectResize(
          s.startW,
          s.startH,
          s.startW + dx * xSign,
          s.startH + dy * ySign,
          e.shiftKey
        );

        return {
          ...l,
          w: clamp(sized.w, 28, rect.width * 2),
          h: clamp(sized.h, 28, rect.height * 2),
          cx: clamp(s.startCx + (dx * xSign) / 2, 0, rect.width),
          cy: clamp(s.startCy + (dy * ySign) / 2, 0, rect.height),
        };
      })
    );
  };

  const endPointer = (e: React.PointerEvent) => {
    const s = dragRef.current;
    if (!s) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(s.pointerId);
    } catch {}
  };

  /* ===== keyboard ===== */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!selectedLayerId) return;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        setLayers((p) => p.filter((l) => l.id !== selectedLayerId));
        setSelectedLayerId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLayerId]);

  /* ===== cleanup ===== */
  useEffect(() => {
    return () => {
      designs.forEach((d) => URL.revokeObjectURL(d.url));
    };
  }, [designs]);

  const baseImageSrc = useMemo(
    () => baseSrc(garment, color, side),
    [garment, color, side]
  );
  const baseFallbackSrc = useMemo(
    () => fallbackBaseSrc(garment, side),
    [garment, side]
  );

  /* =====================
     JSX
  ===================== */
  return (
    <>
      <SiteHeader />

      <section className="apply-hero">
        <h1>15 DESIGN CONTEST</h1>
        <p className="apply-sub">あなたのデザインが、15の次の一枚に。</p>
      </section>

      <section className="apply-shell">
        <aside className="apply-sidebar">
          {/* 商品 */}
          <div className="sb-group">
            <div className="sb-title">商品</div>
            <div className="sb-pills">
              {(["tshirt", "hoodie", "jacket", "knit"] as Garment[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={"sb-pill" + (garment === g ? " is-active" : "")}
                  onClick={() => {
                    setGarment(g);
                    setSelectedLayerId(null);
                  }}
                >
                  {g === "tshirt"
                    ? "Tシャツ"
                    : g === "hoodie"
                    ? "パーカー"
                    : g === "jacket"
                    ? "ジャケット"
                    : "ニット"}
                </button>
              ))}
            </div>
          </div>

          {/* カラー */}
          <div className="sb-group">
            <div className="sb-title">商品カラー</div>
            <div className="sb-colors">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  className={"sb-color" + (color === c.key ? " is-active" : "")}
                  onClick={() => setColor(c.key)}
                >
                  <span className="sb-colorChip" style={{ background: c.chip }} />
                </button>
              ))}
            </div>
          </div>

          {/* 位置 */}
          <div className="sb-group">
            <div className="sb-title">プリント位置</div>
            <div className="sb-pills">
              <button
                className={"sb-pill" + (side === "front" ? " is-active" : "")}
                onClick={() => setSide("front")}
              >
                前面
              </button>
              <button
                className={"sb-pill" + (side === "back" ? " is-active" : "")}
                onClick={() => setSide("back")}
              >
                背面
              </button>
            </div>
          </div>

          {/* upload */}
          <div className="sb-group">
            <div className="sb-title">アップロード</div>
            <label className="sb-file">
              <input type="file" accept="image/*" onChange={handleFile} />
              <span className="sb-fileBtn">画像を選ぶ</span>
            </label>

            {designs.length > 0 && (
              <div className="sb-thumbs">
                {designs.map((d) => (
                  <button
                    key={d.id}
                    className={
                      "sb-thumb" + (activeDesignId === d.id ? " is-active" : "")
                    }
                    onClick={() => setActiveDesignId(d.id)}
                  >
                    <img src={d.url} alt={d.name} />
                  </button>
                ))}
              </div>
            )}

            <button
              className="sb-add"
              onClick={addLayerToCenter}
              disabled={!activeDesignId}
            >
              追加する
            </button>

            <div className="sb-help">
              • 角ドラッグで拡大縮小（Shiftで比率固定）
              <br />• Deleteで削除
            </div>
          </div>
        </aside>

        {/* ===== editor ===== */}
        <main className="apply-main">
          <div className="apply-stageWrap">
            <div
              className="apply-stage"
              ref={editorRef}
              onPointerDown={onEditorPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
            >
              <div className="apply-base">
                <Image
                  src={baseImageSrc}
                  alt="base garment"
                  width={1560}
                  height={1444}
                  className="apply-baseImg"
                  priority
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      baseFallbackSrc;
                  }}
                />
              </div>

              {layersForSide.map((layer) => {
                const url = getDesignUrl(layer.designId);
                if (!url) return null;
                const selected = layer.id === selectedLayerId;

                return (
                  <div
                    key={layer.id}
                    className={
                      "apply-layer" + (selected ? " is-selected" : "")
                    }
                    style={{
                      left: layer.cx,
                      top: layer.cy,
                      width: layer.w,
                      height: layer.h,
                      transform: "translate(-50%, -50%)",
                    }}
                    onPointerDown={beginTransform(layer.id, "move")}
                  >
                    <img src={url} draggable={false} />

                    {selected && (
                      <>
                        <div className="apply-bbox" />
                        {(
                          ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]
                        ).map((h) => (
                          <div
                            key={h}
                            className={`apply-handle apply-handle--${h}`}
                            onPointerDown={beginTransform(layer.id, h)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </section>

      {/* ===== 独立CTA ===== */}
      <div className="apply-cta">
        <div className="apply-ctaInner">
          <Link className="apply-ctaBtn" href="/contest/apply/submit">
            次へ進む
          </Link>
        </div>
      </div>
    </>
  );
}
