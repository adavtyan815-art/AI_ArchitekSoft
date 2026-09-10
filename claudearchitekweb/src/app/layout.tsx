import type { Metadata } from "next";
import { Inter, Noto_Sans_Armenian } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const armenian = Noto_Sans_Armenian({ subsets: ["armenian"], variable: "--font-armenian", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ArchiTek Soft — KitchenPro",
  description: "See the kitchen in 3D before it is built. Interactive showroom links and production documents from one design.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3100"),
  icons: { icon: "/brand/favicon.png", apple: "/brand/apple-touch-icon.png" },
  openGraph: { siteName: "ArchiTek Soft", images: ["/brand/share.jpg"] },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = h.get("x-locale") || "hy";
  return (
    <html lang={lang} className={`${inter.variable} ${armenian.variable}`}>
      <body>{children}</body>
    </html>
  );
}
