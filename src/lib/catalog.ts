// src/lib/catalog.ts
export const CATEGORIES = {
  shirt:   { label: "SHIRT",   listPath: "/shirt",   backKeys: ["gender", "sleeve"] as const },
  bottoms: { label: "BOTTOMS", listPath: "/bottoms", backKeys: ["gender", "type"] as const },
  hoodie:  { label: "HOODIE",  listPath: "/hoodie",  backKeys: ["gender"] as const },
  jacket:  { label: "JACKET",  listPath: "/jacket",  backKeys: ["gender"] as const },
  knit:    { label: "KNIT",    listPath: "/knit",    backKeys: ["gender"] as const },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
