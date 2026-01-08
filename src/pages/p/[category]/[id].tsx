// src/pages/p/[category]/[id].tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProductDetailView from "@/components/ProductDetail";
import { CATEGORIES, type CategoryKey } from "@/lib/catalog";
import { PRODUCTS_BY_CATEGORY, type ProductDetail } from "@/lib/products";

type Q = Record<string, string>;

function pickQuery(routerQuery: any, keys: readonly string[]) {
  const q: Q = {};
  for (const k of keys) {
    const v = routerQuery?.[k];
    if (typeof v !== "string" || !v.length) continue;
    if ((k === "sleeve" || k === "type") && v === "all") continue;
    q[k] = v;
  }
  if (!q.gender) q.gender = routerQuery?.gender === "men" ? "men" : "women";
  return q;
}

export default function ProductDetailUnifiedPage() {
  const router = useRouter();
  const { category, id } = router.query as { category?: string; id?: string };

  const cat = category && category in CATEGORIES ? (category as CategoryKey) : null;
  const catInfo = cat ? CATEGORIES[cat] : null;

  const product: ProductDetail | null = useMemo(() => {
    if (!cat || !id) return null;
    return PRODUCTS_BY_CATEGORY[cat]?.[id] ?? null;
  }, [cat, id]);

  const backQuery = useMemo(() => {
    if (!catInfo) return { gender: router.query?.gender === "men" ? "men" : "women" };
    return pickQuery(router.query, catInfo.backKeys);
  }, [catInfo, router.query]);

  if (!catInfo) {
    return (
      <div className="pdPage">
        <SiteHeader />
        <main className="pdMain">
          <div className="pdNotFound">
            <p className="muted">Category not found.</p>
            <Link className="pdBack" href="/">← Back to Home</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pdPage">
        <SiteHeader />
        <main className="pdMain">
          <div className="pdNotFound">
            <p className="muted">Product not found.</p>
            <Link className="pdBack" href={{ pathname: catInfo.listPath, query: backQuery }}>
              ← Back to {catInfo.label}
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} | 15 — Okinawa Art Apparel</title>
        <meta name="description" content={product.description ?? product.name} />
      </Head>

      <div className="pdPage">
        <SiteHeader />

        <ProductDetailView
          categoryKey={cat as string}
          categoryLabel={catInfo.label}
          backHref={{ pathname: catInfo.listPath, query: backQuery }}
          product={product}
        />

        <SiteFooter />
      </div>
    </>
  );
}
