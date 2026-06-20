// src/pages/_app.tsx
import "@/styles/globals.css";
import "@/styles/70_components.css";

import type { AppProps } from "next/app";
import { CartProvider } from "@/contexts/CartContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith("/admin");

  useEffect(() => {
    document.body.classList.toggle("is-admin", isAdmin);
  }, [isAdmin]);

  return (
    <CartProvider>
      <div className={isAdmin ? "adminRoot" : undefined}>
        <Component {...pageProps} />
      </div>
    </CartProvider>
  );
}
