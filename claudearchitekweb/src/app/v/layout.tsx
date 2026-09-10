import type { Metadata } from "next";

/**
 * Per-project Web Viewer (/v/[slug]) — the full-screen 3D route a client opens
 * from their page. Same minimal shell as /p: no site header/footer, never indexed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "ArchiTek Soft — KitchenPro",
};

export default function ViewerRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-bg">{children}</div>;
}
