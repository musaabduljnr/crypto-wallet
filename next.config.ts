import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
  rewrites: async () => [
    {
      source: "/auth/:path*",
      destination: "/:path*",
    },
    {
      source: "/dashboard/transfer",
      destination: "/transfer",
    },
    {
      source: "/dashboard/withdraw",
      destination: "/withdraw",
    },
    {
      source: "/dashboard/receive",
      destination: "/receive",
    },
    {
      source: "/dashboard/swap",
      destination: "/swap",
    },
    {
      source: "/dashboard/add-money",
      destination: "/add-money",
    },
    {
      source: "/dashboard/history",
      destination: "/history",
    },
    {
      source: "/dashboard/settings",
      destination: "/settings",
    },
  ],
};

export default nextConfig;
