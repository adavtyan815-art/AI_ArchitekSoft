import type { NextConfig } from "next";
import { NON_DOCUMENT_CSP } from "./src/lib/csp";

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
  // The dev tools bubble sits on top of the phone tab bar; it adds nothing for this project.
  devIndicators: false,
  experimental: {
    // Forms post small payloads; files go to /api/admin/upload and /api/upload/public, which are
    // route handlers and not limited by this option. A large cap here would let an anonymous client
    // make the server buffer that much before the sign-in action even looks at the password.
    serverActions: { bodySizeLimit: "2mb" },
    // Middleware clones the request body, so this is the ceiling for anything posted to a *page* route.
    // Keep it at or above the server-action limit above. /api and /media are excluded from the
    // middleware matcher (see src/middleware.ts), so uploads never pass through here.
    middlewareClientMaxBodySize: "4mb",
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
      // Content-Security-Policy for documents is per-request: it carries a nonce, so it is set in
      // src/middleware.ts (which covers every path except the two excluded from its matcher below).
      // /api answers JSON and never passes through the middleware, so its policy is a constant.
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: NON_DOCUMENT_CSP }] },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      // robots.txt no longer disallows /p/, so crawlers do fetch client pages now. The pages already
      // carry <meta name="robots" content="noindex, nofollow">; the header backs that up and also
      // covers the non-HTML responses (a 404, a redirect) that carry no meta tag.
      { source: "/p/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/v/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
