import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      { source: "/shirt/:id",   destination: "/p/shirt/:id" },
      { source: "/bottoms/:id", destination: "/p/bottoms/:id" },
      { source: "/hoodie/:id",  destination: "/p/hoodie/:id" },
      { source: "/jacket/:id",  destination: "/p/jacket/:id" },
      { source: "/knit/:id",    destination: "/p/knit/:id" },
    ];
  },
};

export default nextConfig;
