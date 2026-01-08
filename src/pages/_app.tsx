// src/pages/_app.tsx
import "@/styles/globals.css";
import "@/styles/70_components.css";

import type { AppProps } from "next/app";
import { CartProvider } from "@/contexts/CartContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Component {...pageProps} />
    </CartProvider>
  );
}
