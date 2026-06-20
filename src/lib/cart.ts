
// src/lib/cart.ts
export type CartItem = {
  variant_id: string;

  id: string;
  slug: string;

  name: string;
  nameJa?: string; // ★追加
  image: string;

  price: number;
  qty: number;
  size: string;
};


const KEY = "fifteen_cart_v1";

export function formatJPY(amount: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `¥${amount.toLocaleString("ja-JP")}`;
  }
}

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function mergeAdd(items: CartItem[], next: CartItem) {
  // same product + same size -> merge qty
  const idx = items.findIndex((x) => x.id === next.id && x.size === next.size);
  if (idx === -1) return [next, ...items];

  const copy = [...items];
  copy[idx] = { ...copy[idx], qty: copy[idx].qty + next.qty };
  return copy;
}

export function calcSubtotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}
