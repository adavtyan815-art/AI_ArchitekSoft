import type { NextConfig } from "next";

/**
 * Performance notes
 * - `output: "standalone"` only when NEXT_STANDALONE=1 (Docker). `next start` is used locally.
 * - Native modules stay external to the server bundle.
 * - Images: AVIF/WebP via next/image for /public assets; uploads are resized by /media?w=.
 * - Long cache headers for immutable static assets and media.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3", "sharp", "ffmpeg-static"],
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // never let the dev watcher index the database, uploads or logs
      config.watchOptions = { ...(config.watchOptions ?? {}), ignored: ["**/node_modules/**", "**/data/**", "**/.next/**", "**/*.log"] };
    }
    return config;
  },
  async redirects() {
    // The product page moved from /kitchenpro (the name of a third-party tool) to /platform.
    return [
      { source: "/kitchenpro", destination: "/platform", permanent: true },
      { source: "/:locale(ru|en)/kitchenpro", destination: "/:locale/platform", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
