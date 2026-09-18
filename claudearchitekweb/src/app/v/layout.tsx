import type { Metadata } from "next";

/**
 * Per-project Web Viewer (/v/[slug]) — the full-screen 3D route a client opens
 * from their page. Same minimal shell as /p: no site header/footer, never indexed.
 */
export const dynamic = "force-dynamic";

/** Same as /p: robots lives in the page's generateMetadata only, so a 404 carries exactly one tag. */
export const metadata: Metadata = {
  title: "ArchiTek Soft",
};

export default function ViewerRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-bg">{children}</div>;
}
