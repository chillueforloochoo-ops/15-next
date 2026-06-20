// src/contexts/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cart";
import { calcSubtotal, loadCart, saveCart } from "@/lib/cart";

// ---- helpers ----
function normalizeLoadedCart(items: any[]): CartItem[] {
  if (!Array.isArray(items)) return [];

  // variant_id が無い行は checkout できないので破棄（運用事故防止）
  const normalized: CartItem[] = [];

  for (const it of items) {
    const variantId = String(it?.variant_id ?? "").trim();
    if (!variantId) continue;

    normalized.push({
      variant_id: variantId,
      id: String(it?.id ?? ""),
      slug: String(it?.slug ?? ""),
      name: String(it?.name ?? ""),
      image: String(it?.image ?? ""),
      price: Number(it?.price ?? 0),
      qty: Math.max(0, Number(it?.qty ?? 0) || 0),
      size: String(it?.size ?? ""),
    });
  }

  return normalized;
}

function sameLine(a: CartItem, b: CartItem) {
  // variant_id が主キー（最優先）
  if (a.variant_id && b.variant_id) return a.variant_id === b.variant_id;
  // 念のための旧互換
  return a.id === b.id && a.size === b.size;
}

function mergeAdd(prev: CartItem[], item: CartItem): CartItem[] {
  const addQty = Math.max(0, Number(item.qty) || 0);
  if (!item.variant_id) return prev;

  const idx = prev.findIndex((x) => sameLine(x, item));
  if (idx === -1) return [...prev, { ...item, qty: addQty }];

  const copy = prev.slice();
  copy[idx] = {
    ...copy[idx],
    ...item,
    qty: Math.max(0, (Number(copy[idx].qty) || 0) + addQty),
  };
  return copy;
}

// ---- context ----
type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  addItem: (item: CartItem) => void;

  // 既存UI互換（bag.tsxが id+size で呼ぶため）
  updateQty: (id: string, size: string, qty: number) => void;
  removeItem: (id: string, size: string) => void;

  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // load on mount（古い形式が混ざっても正規化して安全に）
  useEffect(() => {
    const loaded = loadCart() as any[];
    setItems(normalizeLoadedCart(loaded));
  }, []);

  // persist
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      subtotal: calcSubtotal(items),

      addItem: (item) => {
        if (!item?.variant_id) return;
        setItems((prev) => mergeAdd(prev, item));
      },

      updateQty: (id, size, qty) => {
        const nextQty = Math.max(0, Number(qty) || 0);
        setItems((prev) =>
          prev.map((x) => (x.id === id && x.size === size ? { ...x, qty: nextQty } : x))
        );
      },

      removeItem: (id, size) => {
        setItems((prev) => prev.filter((x) => !(x.id === id && x.size === size)));
      },

      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
