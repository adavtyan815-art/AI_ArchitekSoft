import type { Metadata } from "next";

/**
 * Client pages (/p/[slug]) use their own minimal shell: no site header/footer,
 * no locale prefix. The thin brand bar + footer live in /p/[slug]/layout.tsx
 * because only that segment knows the link's language.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "ArchiTek Soft — KitchenPro",
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-paper">{children}</div>;
}
