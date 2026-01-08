// src/contexts/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cart";
import { calcSubtotal, loadCart, mergeAdd, saveCart } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  addItem: (item: CartItem) => void;
  updateQty: (id: string, size: string, qty: number) => void;
  removeItem: (id: string, size: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // load on mount
  useEffect(() => {
    setItems(loadCart());
  }, []);

  // persist
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      subtotal: calcSubtotal(items),
      addItem: (item) => setItems((prev) => mergeAdd(prev, item)),
      updateQty: (id, size, qty) => {
  const nextQty = Math.max(0, Number(qty) || 0);

  setItems((prev) =>
    prev.map((x) =>
      x.id === id && x.size === size ? { ...x, qty: nextQty } : x
    )
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
