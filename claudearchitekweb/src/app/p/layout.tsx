import type { Metadata } from "next";

/**
 * Client pages (/p/[slug]) use their own minimal shell: no site header/footer,
 * no locale prefix. The thin brand bar + footer live in /p/[slug]/layout.tsx
 * because only that segment knows the link's language.
 */
export const dynamic = "force-dynamic";

/**
 * No `robots` here on purpose. Every page under /p sets `robots: { index: false, follow: false }`
 * in its own generateMetadata, and Next adds its own `<meta name="robots" content="noindex">` when
 * it renders the not-found boundary — a layout-level copy on top of that put two (slightly
 * different) robots tags in the same document. The X-Robots-Tag header in next.config.ts covers the
 * 404 and every non-HTML answer besides.
 */
export const metadata: Metadata = {
  title: "ArchiTek Soft",
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-bg">{children}</div>;
}
