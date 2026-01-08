// src/lib/products.ts
import type { CategoryKey } from "./catalog";

export type Size = { label: string; note?: string; inStock: boolean };

export type ProductDetail = {
  id: string;
  name: string;
  nameJa: string;
  price: string;
  description?: string;
  images: string[];
  sizes: Size[];
  color?: string;
};

export const PRODUCTS_BY_CATEGORY: Record<CategoryKey, Record<string, ProductDetail>> = {
  shirt: {
    "monster-cookie": {
      id: "monster-cookie",
      name: "Monster Cookie Shirt",
      nameJa: "Monster Cookie",
      price: "¥3,800",
      description: "Quiet statement for daily life. Premium cotton, relaxed cut.",
      color: "Off White",
      images: ["/products/tshirt-01.png", "/products/tshirt-01-b.png", "/products/tshirt-01-c.jpg", "/products/tshirt-01-d.jpg"],
      sizes: [
        { label: "S", note: "身幅 52 / 着丈 66", inStock: false },
        { label: "M", note: "身幅 55 / 着丈 69", inStock: true },
        { label: "L", note: "身幅 58 / 着丈 72", inStock: true },
        { label: "XL", note: "身幅 61 / 着丈 75", inStock: false },
      ],
    },
    "okinawa-night": {
      id: "okinawa-night",
      name: "Okinawa Night Shirt",
      nameJa: "Okinawa Night",
      price: "¥3,800",
      description: "Soft structure. Minimal. Made for everyday presence.",
      color: "Brown",
      images: ["/products/tshirt-02.png", "/products/tshirt-02-b.jpg"],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: false },
        { label: "XL", inStock: false },
      ],
    },
    "reef-line": {
      id: "reef-line",
      name: "Reef Line Shirt",
      nameJa: "Reef Line",
      price: "¥3,800",
      description: "A calm line inspired by Okinawa reef. Premium cotton.",
      color: "Burgundy",
      images: ["/products/tshirt-03.png", "/products/tshirt-03-b.jpg"],
      sizes: [
        { label: "S", inStock: false },
        { label: "M", inStock: false },
        { label: "L", inStock: true },
        { label: "XL", inStock: true },
      ],
    },
  },

  knit: {
    "calm-weave": {
      id: "calm-weave",
      name: "Calm Weave Knit",
      nameJa: "Calm Weave",
      price: "¥8,800",
      description: "Soft knit fabric. Relaxed fit. Designed for layering.",
      color: "Oat",
      images: ["/products/knit-01.png", "/products/knit-01-b.png"],
      sizes: [
        { label: "S", note: "身幅 54 / 着丈 64", inStock: true },
        { label: "M", note: "身幅 57 / 着丈 67", inStock: true },
        { label: "L", note: "身幅 60 / 着丈 70", inStock: true },
        { label: "XL", note: "身幅 63 / 着丈 73", inStock: false },
      ],
    },
    "night-fiber": {
      id: "night-fiber",
      name: "Night Fiber Knit",
      nameJa: "Night Fiber",
      price: "¥8,800",
      description: "Warm knit. Clean lines. Everyday essential.",
      color: "Black",
      images: ["/products/knit-02.png", "/products/knit-02-b.png"],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: false },
        { label: "XL", inStock: false },
      ],
    },
    "reef-soft": {
      id: "reef-soft",
      name: "Reef Soft Knit",
      nameJa: "Reef Soft",
      price: "¥8,800",
      description: "Soft touch. Minimal branding. Built for calm days.",
      color: "Off White",
      images: ["/products/knit-03.png", "/products/knit-03-b.png"],
      sizes: [
        { label: "S", inStock: false },
        { label: "M", inStock: true },
        { label: "L", inStock: true },
        { label: "XL", inStock: true },
      ],
    },
  },

  jacket: {
    "storm-shell": {
      id: "storm-shell",
      name: "Storm Shell Jacket",
      nameJa: "Storm Shell",
      price: "¥12,800",
      description: "Water-resistant shell. Structured silhouette. Quiet statement.",
      color: "Charcoal",
      images: ["/products/jacket-01.png", "/products/jacket-01-b.png"],
      sizes: [
        { label: "S", note: "身幅 56 / 着丈 64", inStock: true },
        { label: "M", note: "身幅 59 / 着丈 67", inStock: true },
        { label: "L", note: "身幅 62 / 着丈 70", inStock: true },
        { label: "XL", note: "身幅 65 / 着丈 73", inStock: false },
      ],
    },
    "night-ridge": {
      id: "night-ridge",
      name: "Night Ridge Jacket",
      nameJa: "Night Ridge",
      price: "¥12,800",
      description: "Light insulation. Clean lines. Everyday outer.",
      color: "Black",
      images: ["/products/jacket-02.png", "/products/jacket-02-b.png"],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: false },
        { label: "XL", inStock: false },
      ],
    },
    "reef-utility": {
      id: "reef-utility",
      name: "Reef Utility Jacket",
      nameJa: "Reef Utility",
      price: "¥12,800",
      description: "Utility pockets. Minimal branding. Built to last.",
      color: "Off White",
      images: ["/products/jacket-03.png", "/products/jacket-03-b.png"],
      sizes: [
        { label: "S", inStock: false },
        { label: "M", inStock: true },
        { label: "L", inStock: true },
        { label: "XL", inStock: true },
      ],
    },
  },

  // ★ bottoms は「前に貼ってくれた bottoms/[id].tsx の PRODUCTS」をここに移してOK
  bottoms: {
    "forest-pants": {
      id: "forest-pants",
      name: "Forest Line Pants",
      nameJa: "Forest Line",
      price: "¥6,800",
      description: "Clean silhouette. Quiet texture. Made for everyday presence.",
      color: "Charcoal",
      images: [
        "/products/bottoms-01.png",
        "/products/bottoms-01-b.png",
        "/products/bottoms-01-c.jpg",
      ],
          sizes: [
        { label: "S", note: "ウエスト 72 / 股下 68", inStock: false },
        { label: "M", note: "ウエスト 76 / 股下 70", inStock: true },
        { label: "L", note: "ウエスト 80 / 股下 72", inStock: true },
        { label: "XL", note: "ウエスト 84 / 股下 74", inStock: false },
      ],
    },
    "okinawa-black-pants": {
      id: "okinawa-black-pants",
      name: "Okinawa Black Pants",
      nameJa: "Okinawa Black",
      price: "¥6,800",
      description: "Soft structure. Minimal. Calm line inspired by Okinawa night.",
      color: "Black",
      images: [
        "/products/bottoms-02.png",
        "/products/bottoms-02-b.jpg",
      ],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: false },
        { label: "XL", inStock: false },
      ],
    },
     "reef-shorts": {
      id: "reef-shorts",
      name: "Reef Shorts",
      nameJa: "Reef",
      price: "¥5,800",
      description: "A calm short inspired by Okinawa reef. Lightweight, easy fit.",
      color: "Sand",
      images: [
        "/products/bottoms-03.png",
        "/products/bottoms-03-b.jpg",
      ],
      sizes: [
        { label: "S", inStock: false },
        { label: "M", inStock: false },
        { label: "L", inStock: true },
        { label: "XL", inStock: true },
      ],
    },
    // 例（ここはあなたの既存定義をコピペして置き換えてOK）
    // "forest-pants": {...},
    // "okinawa-black-pants": {...},
    // "reef-shorts": {...},
  },

  // ★ hoodie の“詳細用 Record<string, ProductDetail>”はまだ貼られてないので、ここに移すだけで完成
  hoodie: {
    "island-core": {
      id: "island-core",
      name: "Island Core Hoodie",
      nameJa: "Island Core",
      price: "¥6,800",
      description: "Quiet warmth. Relaxed silhouette. Made for everyday presence.",
      color: "Charcoal",
      images: ["/products/hoodie-01.png"],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: true },
        { label: "XL", inStock: false },
      ],
    },
    
    "night-wave": {
      id: "night-wave",
      name: "Night Wave Hoodie",
      nameJa: "Night Wave",
      price: "¥6,800",
      description: "Soft structure. Minimal. Built for calm nights.",
      color: "Black",
      images: ["/products/hoodie-02.png"],
      sizes: [
        { label: "S", inStock: true },
        { label: "M", inStock: true },
        { label: "L", inStock: false },
        { label: "XL", inStock: false },
      ],
    },
    
    "reef-archive": {
      id: "reef-archive",
      name: "Reef Archive Hoodie",
      nameJa: "Reef Archive",
      price: "¥6,800",
      description: "A calm archive line inspired by Okinawa reef. Premium fleece.",
      color: "Off White",
      images: ["/products/hoodie-03.png"],
      sizes: [
        { label: "S", inStock: false },
        { label: "M", inStock: true },
        { label: "L", inStock: true },
        { label: "XL", inStock: true },
      ],
    }
  },
};
