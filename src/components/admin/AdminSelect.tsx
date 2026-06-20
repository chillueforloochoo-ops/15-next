// src/components/admin/AdminSelect.tsx
import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

type Opt = { value: string; label: string; disabled?: boolean };

type Props = {
  className?: string;
  value: string;
  options: Opt[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type Pos = { top: number; left: number; width: number; maxHeight: number };

export function AdminSelect({
  className,
  value,
  options,
  placeholder = "選択してください",
  onChange,
  disabled,
}: Props) {
  const btnId = useId();
  const listId = useId();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const label = selected?.label ?? "";

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const computePos = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const gap = 8;

    // 画面内に収まる最大高さ（下方向優先）
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const top = Math.min(r.bottom + gap, viewportH - 12);
    const left = Math.min(Math.max(r.left, 12), viewportW - 12);

    // 幅はボタンに合わせる（右にはみ出す場合は調整）
    const width = Math.min(r.width, viewportW - left - 12);

    const maxHeight = Math.max(180, viewportH - top - 12);

    setPos({ top, left, width, maxHeight });
  };

  // openになった瞬間に位置を確定（レイアウト後）
  useLayoutEffect(() => {
    if (!open) return;
    computePos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, options.length]);

  // スクロール/リサイズで追従（固定配置でも座標を更新）
  useEffect(() => {
    if (!open) return;

    const onResize = () => computePos();
    // scrollはcaptureで拾う（親がスクロール要素でも拾える）
    const onScroll = () => computePos();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 外クリック / ESC で閉じる（Portal内も判定）
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      const menu = menuRef.current;
      const t = e.target as Node;

      if (wrap && wrap.contains(t)) return;
      if (menu && menu.contains(t)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`aSelectWrap ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        className="aSelectBtn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        id={btnId}
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
      >
        <span className={`aSelectBtnLabel ${label ? "" : "isPlaceholder"}`}>
          {label ? label : placeholder}
        </span>
        <span className={`aSelectChevron ${open ? "isOpen" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className="aSelectMenu aSelectMenu--portal"
              role="presentation"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
            >
              <ul className="aSelectList" role="listbox" id={listId} aria-labelledby={btnId} tabIndex={-1}>
                {options.map((o) => {
                  const isSel = o.value === value;
                  return (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSel}
                      className={`aSelectOption ${isSel ? "isSelected" : ""} ${o.disabled ? "isDisabled" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (o.disabled) return;
                        commit(o.value);
                      }}
                    >
                      <span className="aSelectOptionLabel">{o.label}</span>
                      {isSel ? (
                        <span className="aSelectCheck" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
