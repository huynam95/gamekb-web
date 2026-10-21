import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Game covers are links pasted from many sites, so any host is allowed.
    // The optimiser endpoint itself requires a signed-in session (see middleware).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Covers rarely change at the same URL; keep resized copies for a month.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // Local mock data in development is served from 127.0.0.1.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
